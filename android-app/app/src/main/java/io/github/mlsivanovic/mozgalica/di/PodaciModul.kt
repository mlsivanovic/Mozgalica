package io.github.mlsivanovic.mozgalica.di

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import io.github.mlsivanovic.mozgalica.BuildConfig
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
    @Singleton
    fun repozitorijum(
        kes: KesProfila,
        tokeni: SkladisteTokena,
        izvor: IzvorProfila,
        podesavanja: PodesavanjaPovezivanja,
        sadrzaj: KesSadrzaja,
        izvorSadrzaja: IzvorSadrzaja,
    ): ProfilRepozitorijum = ProfilRepozitorijum(kes, tokeni, izvor, podesavanja, sadrzaj, izvorSadrzaja)
}
