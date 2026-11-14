package io.github.mlsivanovic.mozgalica.podaci

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement

// PostgreSQL jsonb broj ponekad stigne kao 100, a ponekad kao 66.7.
object BrojSerializer : KSerializer<Double> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("Broj", PrimitiveKind.DOUBLE)

    override fun deserialize(decoder: Decoder): Double {
        val broj = decoder.jsonDecoder().decodeJsonElement() as JsonPrimitive
        return broj.content.toDouble()
    }

    override fun serialize(encoder: Encoder, value: Double) {
        val json = encoder as JsonEncoder
        val celina = value % 1.0 == 0.0
        json.encodeJsonElement(JsonPrimitive(if (celina) value.toLong() else value))
    }
}

@Serializable
data class Opcija(val id: String, val text: String)

@Serializable(with = OpcijeSerializer::class)
sealed interface OpcijeJson {
    @Serializable
    data class Lista(val stavke: List<Opcija>) : OpcijeJson

    @Serializable
    data class Uparivanje(val left: List<Opcija>, val right: List<Opcija>) : OpcijeJson
}

object OpcijeSerializer : KSerializer<OpcijeJson> {
    override val descriptor: SerialDescriptor = buildClassSerialDescriptor("OpcijeJson")

    override fun deserialize(decoder: Decoder): OpcijeJson {
        val json = decoder.jsonDecoder()
        val element = json.decodeJsonElement()
        return when (element) {
            is kotlinx.serialization.json.JsonArray ->
                OpcijeJson.Lista(element.map { json.json.decodeFromJsonElement<Opcija>(it) })
            is JsonObject -> json.json.decodeFromJsonElement<OpcijeJson.Uparivanje>(element)
            else -> throw IllegalArgumentException("Opcije nisu ni niz ni objekat.")
        }
    }

    override fun serialize(encoder: Encoder, value: OpcijeJson) {
        val json = encoder as JsonEncoder
        val element = when (value) {
            is OpcijeJson.Lista -> json.json.encodeToJsonElement(value.stavke)
            is OpcijeJson.Uparivanje -> json.json.encodeToJsonElement(value)
        }
        json.encodeJsonElement(element)
    }
}

@Serializable(with = OdgovorDetetaSerializer::class)
sealed interface OdgovorDeteta {
    @Serializable
    data class Jedan(val optionId: String?) : OdgovorDeteta

    @Serializable
    data class Vise(val optionIds: List<String>) : OdgovorDeteta

    @Serializable
    data class Broj(val value: String) : OdgovorDeteta

    @Serializable
    data class Logicki(val value: Boolean?) : OdgovorDeteta

    @Serializable
    data class Tekst(val text: String) : OdgovorDeteta

    @Serializable
    data class Parovi(val pairs: Map<String, String>) : OdgovorDeteta
}

object OdgovorDetetaSerializer : KSerializer<OdgovorDeteta> {
    override val descriptor: SerialDescriptor = buildClassSerialDescriptor("OdgovorDeteta")

    override fun deserialize(decoder: Decoder): OdgovorDeteta {
        val json = decoder.jsonDecoder()
        val element = json.decodeJsonElement() as JsonObject
        return when {
            "optionIds" in element -> json.json.decodeFromJsonElement<OdgovorDeteta.Vise>(element)
            "optionId" in element -> json.json.decodeFromJsonElement<OdgovorDeteta.Jedan>(element)
            "text" in element -> json.json.decodeFromJsonElement<OdgovorDeteta.Tekst>(element)
            "pairs" in element -> json.json.decodeFromJsonElement<OdgovorDeteta.Parovi>(element)
            "value" in element -> vrednost(element.getValue("value"))
            else -> throw IllegalArgumentException("Nepoznat oblik odgovora.")
        }
    }

    override fun serialize(encoder: Encoder, value: OdgovorDeteta) {
        val json = encoder as JsonEncoder
        val element = when (value) {
            is OdgovorDeteta.Jedan -> json.json.encodeToJsonElement(value)
            is OdgovorDeteta.Vise -> json.json.encodeToJsonElement(value)
            is OdgovorDeteta.Broj -> json.json.encodeToJsonElement(value)
            is OdgovorDeteta.Logicki -> json.json.encodeToJsonElement(value)
            is OdgovorDeteta.Tekst -> json.json.encodeToJsonElement(value)
            is OdgovorDeteta.Parovi -> json.json.encodeToJsonElement(value)
        }
        json.encodeJsonElement(element)
    }
}

@Serializable(with = TacanOdgovorSerializer::class)
sealed interface TacanOdgovor {
    @Serializable
    data class Jedan(val optionId: String) : TacanOdgovor

    @Serializable
    data class Vise(val optionIds: List<String>) : TacanOdgovor

    @Serializable
    data class Broj(@Serializable(with = BrojSerializer::class) val value: Double) : TacanOdgovor

    @Serializable
    data class Logicki(val value: Boolean) : TacanOdgovor

    @Serializable
    data class Tekst(val accept: List<String>) : TacanOdgovor

    @Serializable
    data class Parovi(val pairs: Map<String, String>) : TacanOdgovor
}

object TacanOdgovorSerializer : KSerializer<TacanOdgovor> {
    override val descriptor: SerialDescriptor = buildClassSerialDescriptor("TacanOdgovor")

    override fun deserialize(decoder: Decoder): TacanOdgovor {
        val json = decoder.jsonDecoder()
        val element = json.decodeJsonElement() as JsonObject
        return when {
            "optionIds" in element -> json.json.decodeFromJsonElement<TacanOdgovor.Vise>(element)
            "optionId" in element -> json.json.decodeFromJsonElement<TacanOdgovor.Jedan>(element)
            "accept" in element -> json.json.decodeFromJsonElement<TacanOdgovor.Tekst>(element)
            "pairs" in element -> json.json.decodeFromJsonElement<TacanOdgovor.Parovi>(element)
            "value" in element -> {
                val vrednost = element.getValue("value") as JsonPrimitive
                if (vrednost.booleanOrNull != null) TacanOdgovor.Logicki(vrednost.content.toBoolean())
                else TacanOdgovor.Broj(vrednost.content.toDouble())
            }
            else -> throw IllegalArgumentException("Nepoznat oblik tačnog odgovora.")
        }
    }

    override fun serialize(encoder: Encoder, value: TacanOdgovor) {
        val json = encoder as JsonEncoder
        val element = when (value) {
            is TacanOdgovor.Jedan -> json.json.encodeToJsonElement(value)
            is TacanOdgovor.Vise -> json.json.encodeToJsonElement(value)
            is TacanOdgovor.Broj -> json.json.encodeToJsonElement(value)
            is TacanOdgovor.Logicki -> json.json.encodeToJsonElement(value)
            is TacanOdgovor.Tekst -> json.json.encodeToJsonElement(value)
            is TacanOdgovor.Parovi -> json.json.encodeToJsonElement(value)
        }
        json.encodeJsonElement(element)
    }
}

private fun Decoder.jsonDecoder(): JsonDecoder = this as JsonDecoder

private fun vrednost(element: kotlinx.serialization.json.JsonElement): OdgovorDeteta = when (element) {
    is JsonNull -> OdgovorDeteta.Logicki(null)
    is JsonPrimitive if element.isString -> OdgovorDeteta.Broj(element.content)
    is JsonPrimitive if element.booleanOrNull != null -> OdgovorDeteta.Logicki(element.content.toBoolean())
    else -> throw IllegalArgumentException("Nepoznata vrednost odgovora.")
}
