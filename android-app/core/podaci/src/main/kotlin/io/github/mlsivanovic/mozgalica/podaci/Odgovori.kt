package io.github.mlsivanovic.mozgalica.podaci

import kotlinx.serialization.Serializable

@Serializable
data class ProfilnaTitula(
    val name: String,
    val minStars: Int,
    val avatar: String?,
    val starsNeeded: Int? = null,
)

@Serializable
data class AktivniKviz(
    val quizToken: String,
    val title: String,
    val description: String?,
    val questionCount: Int,
    val attemptState: String,
    val answeredCount: Int,
    val timeLimitSeconds: Int?,
    val remainingSeconds: Int?,
)

@Serializable
data class IstorijaKviza(
    val attemptId: String,
    val title: String,
    val submittedAt: String,
    @Serializable(with = BrojSerializer::class) val scorePct: Double,
    val starsAwarded: Int,
    val pendingReview: Boolean,
)

@Serializable
data class AktivnaPartija(
    val playToken: String,
    val approximateElo: Int,
    val childColor: String,
    val clockSeconds: Int?,
    val status: String,
    val fen: String,
    val turnColor: String,
    val whiteRemainingMs: Long?,
    val blackRemainingMs: Long?,
    val createdAt: String,
)

@Serializable
data class IstorijaPartije(
    val gameId: String,
    val playToken: String,
    val approximateElo: Int,
    val childColor: String,
    val result: String,
    val termination: String,
    val starsAwarded: Int,
    val completedAt: String,
)

@Serializable
data class ProfilOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val name: String,
    val avatar: String,
    val totalStars: Int,
    val spendableStars: Int,
    val currentTitle: ProfilnaTitula?,
    val nextTitle: ProfilnaTitula?,
    val activeQuizzes: List<AktivniKviz>,
    val history: List<IstorijaKviza>,
    val activeChessGames: List<AktivnaPartija>,
    val chessHistory: List<IstorijaPartije>,
)

@Serializable
data class KvizMetaOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val accessMode: String,
    val profileToken: String,
    val childName: String,
    val childAvatar: String,
    val attemptState: String,
    val answeredCount: Int,
    val title: String,
    val description: String?,
    val questionCount: Int,
    val totalPoints: Int,
    val timeLimitSeconds: Int?,
    val remainingSeconds: Int?,
    val requireName: Boolean,
    val requireLabel: Boolean,
    val attemptsLeft: Int,
    val maxAttempts: Int,
)

@Serializable
data class PitanjeZaDete(
    val id: String,
    val type: String,
    val text: String,
    val options: OpcijeJson?,
    val hasHint: Boolean,
    val hint: String?,
    val points: Int,
)

@Serializable
data class PokusajOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val resumed: Boolean = false,
    val accessMode: String,
    val profileToken: String,
    val attemptToken: String,
    val attemptId: String,
    val attemptNo: Int,
    val childName: String,
    val deadlineAt: String?,
    val serverNow: String,
    val questions: List<PitanjeZaDete>,
    val savedAnswers: Map<String, OdgovorDeteta>,
    val hintsUsed: Int,
    val hintsUnlocked: List<String>,
    val remainingSeconds: Int?,
)

@Serializable
data class CuvanjeOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val saved: Int,
    val serverNow: String,
)

@Serializable
data class TajmerOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val remainingSeconds: Int,
    val serverNow: String,
)

@Serializable
data class SavetOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val hint: String,
    val hintsUsed: Int,
    val remaining: Int,
)

@Serializable
data class RezultatPitanja(
    val id: String,
    val type: String,
    val text: String,
    val options: OpcijeJson?,
    val points: Int,
    val answer: OdgovorDeteta,
    val isCorrect: Boolean,
    val awardedPoints: Int,
    val correct: TacanOdgovor?,
    val explanation: String?,
    val topicSlug: String?,
)

@Serializable
data class PonovniInfo(
    val available: Boolean,
    val explanationsSeen: Boolean,
    val started: Boolean,
    val submitted: Boolean,
    val allCorrect: Boolean?,
)

@Serializable
data class RezultatOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val alreadySubmitted: Boolean,
    val accessMode: String,
    val profileToken: String,
    val showResult: Boolean,
    val showCorrect: Boolean,
    val starsAwarded: Int?,
    val totalPoints: Int,
    val maxPoints: Int,
    @Serializable(with = BrojSerializer::class) val scorePct: Double,
    val correctCount: Int,
    val incorrectCount: Int,
    val passed: Boolean,
    val passThresholdPct: Int,
    val attemptsLeft: Int,
    val pendingReview: Boolean,
    val questions: List<RezultatPitanja>,
    val retry: PonovniInfo,
)

@Serializable
data class PotvrdaOdgovor(
    val ok: Boolean,
    val error: String? = null,
)

@Serializable
data class PonovnoPitanje(
    val id: String,
    val position: Int,
    val type: String,
    val text: String,
    val options: OpcijeJson?,
    val points: Int,
    val answer: OdgovorDeteta?,
    val isCorrect: Boolean?,
    val correct: TacanOdgovor?,
    val explanation: String?,
)

@Serializable
data class PonovniOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val submitted: Boolean,
    val alreadySubmitted: Boolean = false,
    val allCorrect: Boolean?,
    val starsAwarded: Int?,
    val questions: List<PonovnoPitanje>,
)

@Serializable
data class StavkaProdavnice(
    val id: String,
    val title: String,
    val description: String?,
    val emoji: String,
    val iconUrl: String?,
    val cost: Int,
    val repeatable: Boolean,
    val purchased: Boolean,
    val awaitingConsumption: Boolean,
    val previousCount: Int,
)

@Serializable
data class KupovinaPrikaz(
    val id: String,
    val title: String,
    val emoji: String,
    val iconUrl: String?,
    val cost: Int,
    val isRepeatable: Boolean,
    val status: String,
    val requestedAt: String,
    val consumedAt: String?,
)

@Serializable
data class ProdavnicaOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val name: String,
    val avatar: String,
    val balance: Int,
    val totalStars: Int,
    val items: List<StavkaProdavnice>,
    val purchases: List<KupovinaPrikaz>,
)

@Serializable
data class KupovinaOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val purchaseId: String,
    val newBalance: Int,
)

@Serializable
data class ObavestenjeDeteta(
    val id: String,
    val eventType: String,
    val title: String,
    val body: String,
    val targetUrl: String,
    val readAt: String?,
    val createdAt: String,
)

@Serializable
data class ObavestenjaOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val unreadCount: Int,
    val notifications: List<ObavestenjeDeteta>,
)

@Serializable
data class OznakaOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val updated: Int,
)

@Serializable
data class CasUDanu(
    val periodNo: Int,
    val subject: String,
    val teacher: String?,
    val room: String?,
    val color: String?,
    val note: String?,
    val startsAt: String,
    val endsAt: String,
    val isCurrent: Boolean,
    val isNext: Boolean?,
)

@Serializable
data class DanRasporeda(
    val date: String,
    val weekday: Int,
    val isBreak: Boolean,
    val shift: String?,
    val lessons: List<CasUDanu>,
)

@Serializable
data class RasporedOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val exists: Boolean,
    val childName: String,
    val rotationMode: String,
    val includeSaturday: Boolean,
    val sharedSlots: Boolean,
    val thisWeekShift: String,
    val weekMonday: String,
    val overrideShift: String?,
    val serverNow: String,
    val today: DanRasporeda,
    val tomorrow: DanRasporeda,
    val week: List<DanRasporeda>,
)

@Serializable
data class PushRegistracijaOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val subscriptionId: String,
)

@Serializable
data class PushStatusOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val active: Boolean,
)

@Serializable
data class SahPotez(
    val ply: Int,
    val player: String,
    val color: String,
    val uci: String,
    val san: String,
    val fenAfter: String,
    val movedAt: String,
    val whiteRemainingMs: Long?,
    val blackRemainingMs: Long?,
)

@Serializable
data class SahStanjeOdgovor(
    val ok: Boolean,
    val error: String? = null,
    val status: String,
    val revision: Int,
    val playToken: String,
    val profileToken: String,
    val childName: String,
    val childColor: String,
    val approximateElo: Int,
    val clockSeconds: Int?,
    val fen: String,
    val turnColor: String,
    val turnStartedAt: String?,
    val whiteRemainingMs: Long?,
    val blackRemainingMs: Long?,
    val serverNow: String,
    val result: String?,
    val termination: String?,
    val starsAwarded: Int?,
    val retriesUsed: Int,
    val retryAvailable: Boolean,
    val undoAvailable: Boolean,
    val moves: List<SahPotez>,
)
