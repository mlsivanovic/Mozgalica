import { beforeEach, describe, expect, it, vi } from 'vitest'
const { rpc, from } = vi.hoisted(() => ({rpc:vi.fn(),from:vi.fn()}))
vi.mock('./supabase', () => ({supabase:() => ({rpc,from})}))
import { ucitajRoditeljskiPregled, ucitajRoditeljskeZadatke } from './roditeljskiPregled'
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
