import { beforeEach, describe, expect, it, vi } from 'vitest'
const { rpc, from } = vi.hoisted(() => ({rpc:vi.fn(),from:vi.fn()}))
vi.mock('./supabase', () => ({supabase:() => ({rpc,from})}))
import {
  filtrirajZadatke, kljucZadatka, obrisiRoditeljskeZadatke, ucitajRoditeljskiPregled, ucitajRoditeljskeZadatke,
  type RoditeljskiZadatak,
} from './roditeljskiPregled'
import { ucitajStatistikuDeteta, dodeliKvizProfilu, listajPokusaje } from './api'
beforeEach(() => rpc.mockReset())
describe('ugovor roditeljskog API-ja', () => {
  it('šalje ispravan parametar detaljnoj statistici', async () => {
    rpc.mockResolvedValue({data:{ok:true},error:null})
    await ucitajStatistikuDeteta('dete-1','2026-08-01','2026-08-31')
    expect(rpc).toHaveBeenCalledWith('admin_get_child_statistics_detail',{p_child_profile_id:'dete-1',p_from_date:'2026-08-01',p_to_date:'2026-08-31'})
  })
  it('razlikuje stvarno praznu listu, grešku servera i nedostupan profil', async () => {
    rpc.mockResolvedValueOnce({data:{ok:true,tasks:[]},error:null})
    expect(await ucitajRoditeljskeZadatke('')).toEqual([])
    expect(rpc).toHaveBeenLastCalledWith('admin_parent_tasks',{p_child_profile_id:null})
    rpc.mockResolvedValueOnce({data:null,error:{message:'network'}})
    await expect(ucitajRoditeljskiPregled('dete')).rejects.toThrow('trenutno nije dostupan')
    rpc.mockResolvedValueOnce({data:{ok:false,error:'not_found'},error:null})
    await expect(ucitajRoditeljskiPregled('nepostojece')).rejects.toThrow('Profil deteta nije dostupan')
  })
  it('zadržava identitet zahteva posle neizvesne dodele', async () => {
    rpc.mockResolvedValueOnce({data:null,error:{message:'Prekid veze'}})
      .mockResolvedValueOnce({data:{id:'jedna-dodela'},error:null})
    const zahtev = '12345678-1234-4234-8234-123456789012'
    await expect(dodeliKvizProfilu('kviz','dete',false,zahtev)).rejects.toThrow()
    expect(await dodeliKvizProfilu('kviz','dete',false,zahtev)).toEqual({id:'jedna-dodela'})
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1])
  })
})

it('ne odseca istoriju i preglede na prvih 1000 pokušaja', async () => {
  const prvaStrana = Array.from({length:1000}, (_,i) => ({id:String(i)}))
  const query = {select:() => query, order:() => query, range:vi.fn()
    .mockResolvedValueOnce({data:prvaStrana,error:null})
    .mockResolvedValueOnce({data:[{id:'stari-neocenjen'}],error:null})}
  from.mockReturnValue(query)
  expect(await listajPokusaje()).toHaveLength(1001)
  expect(query.range).toHaveBeenLastCalledWith(1000,1999)
  query.range.mockResolvedValueOnce({data:prvaStrana,error:null}).mockResolvedValueOnce({data:null,error:{message:'Greška druge strane'}})
  await expect(listajPokusaje()).rejects.toThrow('Greška druge strane')
})

const zadatak = (izmene: Partial<RoditeljskiZadatak> = {}): RoditeljskiZadatak => ({
  id: 'kviz-1', kind: 'quiz', childProfileId: 'dete-1', childName: 'Filip', avatar: null,
  title: 'Kviz iz matematike', createdAt: '2026-11-15T08:00:00Z', state: 'assigned', unassigned: false,
  ...izmene,
})
const filter = (izmene: Partial<{ vrsta: string; stanje: string; pretraga: string }> = {}) =>
  ({ vrsta: '', stanje: '', pretraga: '', ...izmene })

describe('filteri i izbor zadataka', () => {
  const zadaci = [
    zadatak(),
    zadatak({ id: 'sah-1', kind: 'chess', title: 'Šah · ELO 1100', state: 'in_progress' }),
    zadatak({ id: 'kviz-2', title: 'Nedodeljeni kviz', childProfileId: null, childName: null, state: 'unassigned', unassigned: true }),
  ]
  it('filtrira po vrsti, stanju i pretrazi bez kvačica', () => {
    expect(filtrirajZadatke(zadaci, filter({ vrsta: 'chess' })).map(z => z.id)).toEqual(['sah-1'])
    expect(filtrirajZadatke(zadaci, filter({ stanje: 'in_progress' })).map(z => z.id)).toEqual(['sah-1'])
    expect(filtrirajZadatke(zadaci, filter({ pretraga: 'sah' })).map(z => z.id)).toEqual(['sah-1'])
    expect(filtrirajZadatke(zadaci, filter({ pretraga: 'filip' })).map(z => z.id)).toEqual(['kviz-1', 'sah-1'])
    expect(filtrirajZadatke(zadaci, filter({ stanje: 'unassigned', vrsta: 'quiz' })).map(z => z.id)).toEqual(['kviz-2'])
    expect(filtrirajZadatke(zadaci, filter({ pretraga: 'nema' }))).toEqual([])
  })
  it('razlikuje ključ dodele od ključa pripremljenog kviza', () => {
    expect(kljucZadatka(zadaci[0])).toBe('quiz:kviz-1:dete-1')
    expect(kljucZadatka(zadaci[2])).toBe('quiz:kviz-2:-')
    expect(kljucZadatka(zadaci[0])).not.toBe(kljucZadatka(zadaci[2]))
  })
})

describe('brisanje zadataka', () => {
  it('šalje tačan spisak i vraća brojače sa servera', async () => {
    rpc.mockResolvedValue({ data: { ok: true, removed: 2, archived: 1, preserved: 1, errors: [] }, error: null })
    const rezultat = await obrisiRoditeljskeZadatke([zadatak(), zadatak({ kind: 'chess', id: 'sah-1', childProfileId: null, childName: null })])
    expect(rpc).toHaveBeenCalledWith('admin_delete_parent_tasks', { p_tasks: [
      { kind: 'quiz', id: 'kviz-1', childProfileId: 'dete-1' },
      { kind: 'chess', id: 'sah-1', childProfileId: null },
    ] })
    expect(rezultat).toEqual({ removed: 2, archived: 1, preserved: 1, errors: [] })
  })
  it('ne zove bazu za prazan izbor i opisuje odbijeno brisanje', async () => {
    rpc.mockClear()
    expect(await obrisiRoditeljskeZadatke([])).toEqual({ removed: 0, archived: 0, preserved: 0, errors: [] })
    expect(rpc).not.toHaveBeenCalled()
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Prekid veze' } })
    await expect(obrisiRoditeljskeZadatke([zadatak()])).rejects.toThrow('Pokušaj ponovo')
    rpc.mockResolvedValueOnce({ data: { ok: false, error: 'forbidden' }, error: null })
    await expect(obrisiRoditeljskeZadatke([zadatak()])).rejects.toThrow('Nemaš dozvolu')
  })
})
