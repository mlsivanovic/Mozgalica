// Privremeno isključeni mejlovi. Obaveštenja stižu kao push i u inbox.
// Izvor istine je server: prekidači su u app_config (migracija 20261117130000):
//   mejl_detetu_novi_kviz       — mejl detetu kad mu se dodeli novi kviz
//   mejl_roditelju_posle_kviza  — mejl roditelju kad dete završi kviz
//   mejl_detetu_nova_partija     — mejl detetu kad mu se dodeli šahovska partija (20261118100000)
//   mejl_roditelju_posle_partije — mejl roditelju kad dete završi partiju
// Ova konstanta samo skriva kontrole u aplikaciji. Ponovno uključivanje: postavi
// konstantu na true i u SQL-u `update public.app_config set value = 'true' where key = '...';`

export const MEJL_DETETU_ZA_NOVI_KVIZ: boolean = false
export const MEJL_RODITELJU_POSLE_KVIZA: boolean = false
export const MEJL_DETETU_ZA_NOVU_PARTIJU: boolean = false
export const MEJL_RODITELJU_POSLE_PARTIJE: boolean = false
