package io.github.mlsivanovic.mozgalica.di

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import io.github.mlsivanovic.mozgalica.BuildConfig
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import io.github.mlsivanovic.mozgalica.podaci.kviz.IzvorKviza
import io.github.mlsivanovic.mozgalica.podaci.kviz.KvizPriprema
import io.github.mlsivanovic.mozgalica.podaci.kviz.KvizSinhronizacija
import io.github.mlsivanovic.mozgalica.podaci.kviz.SkladistePokusaja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IzvorProfila
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IzvorSadrzaja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.KesProfila
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.KesSadrzaja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.LokalnoSkladiste
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PodesavanjaAplikacije
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PodesavanjaPovezivanja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.ProfilRepozitorijum
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SkladisteTokena
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SupabaseIzvorProfila
import io.github.mlsivanovic.mozgalica.podaci.sah.IzvorSaha
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object PodaciModul {
    @Provides
    @Singleton
    fun lokalno(@ApplicationContext context: Context): LokalnoSkladiste = LokalnoSkladiste(context)

    @Provides
    fun kes(lokalno: LokalnoSkladiste): KesProfila = lokalno.kes

    @Provides
    fun tokeni(lokalno: LokalnoSkladiste): SkladisteTokena = lokalno.tokeni

    @Provides
    fun sadrzaj(lokalno: LokalnoSkladiste): KesSadrzaja = lokalno.sadrzaj

    @Provides
    fun pokusaji(lokalno: LokalnoSkladiste): SkladistePokusaja = lokalno.pokusaji

    @Provides
    fun podesavanja(lokalno: LokalnoSkladiste): PodesavanjaPovezivanja = lokalno.podesavanja

    @Provides
    fun podesavanjaAplikacije(lokalno: LokalnoSkladiste): PodesavanjaAplikacije = lokalno.podesavanja

    @Provides
    @Singleton
    fun supabase(): SupabaseIzvorProfila = SupabaseIzvorProfila(
        url = BuildConfig.SUPABASE_URL,
        anonKljuc = BuildConfig.SUPABASE_ANON_KLJUC,
    )

    @Provides
    fun izvor(supabase: SupabaseIzvorProfila): IzvorProfila = supabase

    @Provides
    fun izvorSadrzaja(supabase: SupabaseIzvorProfila): IzvorSadrzaja = supabase

    @Provides
    fun izvorKviza(supabase: SupabaseIzvorProfila): IzvorKviza = supabase

    @Provides
    fun izvorSaha(supabase: SupabaseIzvorProfila): IzvorSaha = supabase

    @Provides
    @Singleton
    fun sinhronizacija(
        skladiste: SkladistePokusaja,
        izvor: IzvorKviza,
        @ApplicationContext context: Context,
    ): KvizSinhronizacija = KvizSinhronizacija(skladiste, izvor, veza = { imaVezu(context) })

    @Provides
    fun priprema(izvor: IzvorKviza, kes: SkladistePokusaja): KvizPriprema = KvizPriprema(izvor, kes)

    @Provides
    @Singleton
    fun repozitorijum(
        kes: KesProfila,
        tokeni: SkladisteTokena,
        izvor: IzvorProfila,
        podesavanja: PodesavanjaPovezivanja,
        sadrzaj: KesSadrzaja,
        izvorSadrzaja: IzvorSadrzaja,
        pokusaji: SkladistePokusaja,
    ): ProfilRepozitorijum = ProfilRepozitorijum(kes, tokeni, izvor, podesavanja, sadrzaj, izvorSadrzaja, pokusaji)
}

internal fun imaVezu(context: Context): Boolean {
    val mreza = context.getSystemService(ConnectivityManager::class.java)
    val aktivna = mreza.activeNetwork ?: return false
    val mogucnosti = mreza.getNetworkCapabilities(aktivna) ?: return false
    return mogucnosti.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
}
