<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\Conversation;
use App\Models\Department;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Chaque test vérifie qu'un compte connecté n'atteint que ce qui le concerne :
 * être authentifié ne suffit pas, il faut être membre.
 */
class ControleAccesTest extends TestCase
{
    use RefreshDatabase;

    private Department $rh;
    private Department $finance;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->rh = Department::create(['name' => 'Ressources humaines', 'code' => 'RH', 'level' => 1]);
        $this->finance = Department::create(['name' => 'Finance', 'code' => 'FIN', 'level' => 1]);
    }

    private function employe(Department $departement, array $attributs = []): User
    {
        return User::factory()->create(array_merge([
            'department_id' => $departement->id,
            'role' => 'employe',
        ], $attributs));
    }

    private function conversationEntre(User ...$membres): Conversation
    {
        $conversation = Conversation::create(['type' => 'private']);
        $conversation->users()->attach(collect($membres)->pluck('id'));

        return $conversation;
    }

    public function test_une_piece_jointe_ne_se_telecharge_que_par_les_membres_de_la_conversation(): void
    {
        $awa = $this->employe($this->rh);
        $moussa = $this->employe($this->rh);
        $intrus = $this->employe($this->rh);
        $conversation = $this->conversationEntre($awa, $moussa);

        Sanctum::actingAs($awa);
        $message = $this->postJson("/api/conversations/{$conversation->id}/messages", [
            'encrypted_content' => 'Voici le contrat',
        ])->assertCreated()->json();
        $piece = $this->post("/api/messages/{$message['id']}/attachments", [
            'file' => UploadedFile::fake()->create('contrat.pdf', 12),
        ])->assertCreated()->json();

        Sanctum::actingAs($intrus);
        $this->getJson("/api/attachments/{$piece['id']}/download")->assertForbidden();

        Sanctum::actingAs($moussa);
        $this->get("/api/attachments/{$piece['id']}/download")->assertOk();
    }

    public function test_les_details_d_un_canal_prive_sont_reserves_a_ses_membres(): void
    {
        $createur = $this->employe($this->rh);
        $intrus = $this->employe($this->rh);
        $prive = Channel::create(['name' => 'direction', 'type' => 'private', 'created_by' => $createur->id]);
        $prive->members()->attach($createur->id, ['role' => 'admin']);
        $public = Channel::create(['name' => 'general', 'type' => 'public', 'created_by' => $createur->id]);

        Sanctum::actingAs($intrus);
        $this->getJson("/api/channels/{$prive->id}")->assertForbidden();
        $this->getJson("/api/channels/{$public->id}")->assertOk();

        Sanctum::actingAs($createur);
        $this->getJson("/api/channels/{$prive->id}")->assertOk();
    }

    public function test_un_profil_hors_de_sa_hierarchie_n_est_pas_visible(): void
    {
        $awa = $this->employe($this->rh);
        $collegue = $this->employe($this->rh);
        $autreService = $this->employe($this->finance);

        Sanctum::actingAs($awa);
        $this->getJson("/api/users/{$collegue->id}")->assertOk();
        $this->getJson("/api/users/{$autreService->id}")->assertForbidden();

        // Une conversation déjà partagée rend le profil visible.
        $this->conversationEntre($awa, $autreService);
        $this->getJson("/api/users/{$autreService->id}")->assertOk();
    }

    public function test_on_ne_demarre_pas_de_conversation_hors_de_sa_hierarchie(): void
    {
        $awa = $this->employe($this->rh);
        $collegue = $this->employe($this->rh);
        $autreService = $this->employe($this->finance);

        Sanctum::actingAs($awa);
        $this->postJson('/api/conversations', [
            'type' => 'private', 'user_ids' => [$autreService->id],
        ])->assertForbidden();
        $this->postJson('/api/conversations', [
            'type' => 'private', 'user_ids' => [$collegue->id],
        ])->assertCreated();
    }

    public function test_un_message_d_une_autre_conversation_ne_peut_pas_etre_marque_lu(): void
    {
        $awa = $this->employe($this->rh);
        $moussa = $this->employe($this->rh);
        $intrus = $this->employe($this->rh);
        $message = $this->conversationEntre($awa, $moussa)->messages()->create([
            'user_id' => $awa->id, 'encrypted_content' => 'Bonjour',
        ]);

        Sanctum::actingAs($intrus);
        $this->postJson("/api/messages/{$message->id}/read")->assertForbidden();
        $this->assertFalse($message->fresh()->is_read);

        Sanctum::actingAs($moussa);
        $this->postJson("/api/messages/{$message->id}/read")->assertOk();
        $this->assertTrue($message->fresh()->is_read);
    }

    public function test_le_temps_reel_refuse_les_canaux_d_autrui_et_les_noms_inconnus(): void
    {
        $awa = $this->employe($this->rh);
        $moussa = $this->employe($this->rh);
        $conversation = $this->conversationEntre($moussa, $this->employe($this->rh));

        Sanctum::actingAs($awa);
        foreach ([
            "private-conversation.{$conversation->id}",
            "private-App.Models.User.{$moussa->id}",
            'private-nimporte-quoi',
        ] as $canal) {
            $this->postJson('/api/broadcasting/auth', [
                'channel_name' => $canal, 'socket_id' => '1234.5678',
            ])->assertForbidden();
        }

        // Un membre obtient sa signature (calculée en local, sans appel réseau).
        config(['broadcasting.connections.pusher' => [
            'key' => 'cle-test', 'secret' => 'secret-test', 'app_id' => '1', 'options' => [],
        ]]);
        Sanctum::actingAs($moussa);
        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => "private-conversation.{$conversation->id}", 'socket_id' => '1234.5678',
        ])->assertOk()->assertJsonStructure(['auth']);
    }

    public function test_la_recherche_fonctionne_hors_postgresql_et_respecte_la_hierarchie(): void
    {
        $awa = $this->employe($this->rh);
        $this->employe($this->rh, ['name' => 'Moussa Ndiaye']);
        $this->employe($this->rh, ['name' => 'Fatou Sow', 'poste' => 'Comptable 100%']);
        $this->employe($this->finance, ['name' => 'Moustapha Fall']);

        Sanctum::actingAs($awa);
        $noms = $this->getJson('/api/users/search?q=MOUS')->assertOk()->json('*.name');
        $this->assertSame(['Moussa Ndiaye'], $noms);

        // « % » est cherché tel quel, pas comme un joker.
        $this->assertSame(['Fatou Sow'], $this->getJson('/api/users/search?q=' . urlencode('0%'))->json('*.name'));
        $this->assertSame([], $this->getJson('/api/users/search?q=' . urlencode('a%z'))->json());
    }

    public function test_le_contenu_des_messages_est_chiffre_en_base(): void
    {
        $awa = $this->employe($this->rh);
        $conversation = $this->conversationEntre($awa, $this->employe($this->rh));

        Sanctum::actingAs($awa);
        $message = $this->postJson("/api/conversations/{$conversation->id}/messages", [
            'encrypted_content' => 'Réunion budget à 15 h',
        ])->assertCreated()->assertJsonPath('encrypted_content', 'Réunion budget à 15 h')->json();

        $brut = DB::table('messages')->where('id', $message['id'])->value('encrypted_content');
        $this->assertStringNotContainsString('budget', $brut);
        $this->assertSame('Réunion budget à 15 h', Message::find($message['id'])->encrypted_content);
    }
}
