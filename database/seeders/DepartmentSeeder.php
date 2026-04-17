<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use App\Models\Channel;
use App\Models\Conversation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        // ── Départements ──
        $dg = Department::create([
            'name' => 'Direction Générale',
            'code' => 'DG',
            'description' => 'Direction générale de l\'entreprise',
            'level' => 0,
        ]);

        $rh = Department::create([
            'name' => 'Ressources Humaines',
            'code' => 'RH',
            'description' => 'Gestion du personnel et recrutement',
            'parent_id' => $dg->id,
            'level' => 1,
        ]);

        $fin = Department::create([
            'name' => 'Finance & Comptabilité',
            'code' => 'FIN',
            'description' => 'Gestion financière et comptable',
            'parent_id' => $dg->id,
            'level' => 1,
        ]);

        $it = Department::create([
            'name' => 'Informatique & IT',
            'code' => 'IT',
            'description' => 'Systèmes d\'information et développement',
            'parent_id' => $dg->id,
            'level' => 1,
        ]);

        $com = Department::create([
            'name' => 'Commercial & Marketing',
            'code' => 'COM',
            'description' => 'Ventes et stratégie marketing',
            'parent_id' => $dg->id,
            'level' => 1,
        ]);

        $log = Department::create([
            'name' => 'Logistique & Production',
            'code' => 'LOG',
            'description' => 'Gestion de la production et logistique',
            'parent_id' => $dg->id,
            'level' => 1,
        ]);

        $jur = Department::create([
            'name' => 'Service Juridique',
            'code' => 'JUR',
            'description' => 'Affaires juridiques et conformité',
            'parent_id' => $dg->id,
            'level' => 1,
        ]);

        // ── Droits de communication entre départements ──
        $communications = [
            [$rh->id, $fin->id], [$fin->id, $rh->id],
            [$rh->id, $jur->id], [$jur->id, $rh->id],
            [$fin->id, $jur->id], [$jur->id, $fin->id],
            [$com->id, $log->id], [$log->id, $com->id],
            [$it->id, $com->id], [$com->id, $it->id],
            [$it->id, $fin->id], [$fin->id, $it->id],
        ];

        foreach ($communications as [$from, $to]) {
            DB::table('department_communications')->insert([
                'from_department_id' => $from,
                'to_department_id' => $to,
            ]);
        }

        // ── Utilisateurs ──
        User::create([
            'name' => 'Amadou Diallo',
            'email' => 'pdg@securechat.com',
            'password' => Hash::make('password123'),
            'department_id' => $dg->id,
            'role' => 'pdg',
            'poste' => 'Président Directeur Général',
        ]);

        $directeurs = [
            ['name' => 'Oumar Ba', 'email' => 'dg@securechat.com', 'dept' => $dg, 'poste' => 'Directeur Général'],
            ['name' => 'Fatou Sow', 'email' => 'rh@securechat.com', 'dept' => $rh, 'poste' => 'Directrice des Ressources Humaines'],
            ['name' => 'Moussa Ndiaye', 'email' => 'fin@securechat.com', 'dept' => $fin, 'poste' => 'Directeur Financier'],
            ['name' => 'Ibrahima Fall', 'email' => 'it@securechat.com', 'dept' => $it, 'poste' => 'Directeur des Systèmes d\'Information'],
            ['name' => 'Aissatou Ba', 'email' => 'com@securechat.com', 'dept' => $com, 'poste' => 'Directrice Commerciale'],
            ['name' => 'Ousmane Diop', 'email' => 'log@securechat.com', 'dept' => $log, 'poste' => 'Directeur Logistique'],
            ['name' => 'Mariama Sy', 'email' => 'jur@securechat.com', 'dept' => $jur, 'poste' => 'Directrice Juridique'],
        ];

        foreach ($directeurs as $d) {
            User::create([
                'name' => $d['name'],
                'email' => $d['email'],
                'password' => Hash::make('password123'),
                'department_id' => $d['dept']->id,
                'role' => 'directeur',
                'poste' => $d['poste'],
            ]);
        }

        $chefs = [
            ['name' => 'Cheikh Mbaye', 'email' => 'chef.recrutement@securechat.com', 'dept' => $rh, 'poste' => 'Chef Recrutement'],
            ['name' => 'Ndèye Diagne', 'email' => 'chef.compta@securechat.com', 'dept' => $fin, 'poste' => 'Chef Comptabilité'],
            ['name' => 'Pape Gueye', 'email' => 'chef.dev@securechat.com', 'dept' => $it, 'poste' => 'Chef Développement'],
            ['name' => 'Awa Niang', 'email' => 'chef.ventes@securechat.com', 'dept' => $com, 'poste' => 'Chef des Ventes'],
            ['name' => 'Modou Sarr', 'email' => 'chef.production@securechat.com', 'dept' => $log, 'poste' => 'Chef Production'],
        ];

        foreach ($chefs as $c) {
            User::create([
                'name' => $c['name'],
                'email' => $c['email'],
                'password' => Hash::make('password123'),
                'department_id' => $c['dept']->id,
                'role' => 'chef_service',
                'poste' => $c['poste'],
            ]);
        }

        $employes = [
            ['name' => 'Coumba Diallo', 'email' => 'secretaire.dg@securechat.com', 'dept' => $dg, 'poste' => 'Secrétaire de Direction'],
            ['name' => 'Fatima Seck', 'email' => 'assistante.dg@securechat.com', 'dept' => $dg, 'poste' => 'Assistante de Direction'],
            ['name' => 'Abdou Faye', 'email' => 'abdou@securechat.com', 'dept' => $rh, 'poste' => 'Chargé RH'],
            ['name' => 'Khady Diouf', 'email' => 'khady@securechat.com', 'dept' => $rh, 'poste' => 'Assistante RH'],
            ['name' => 'Babacar Sall', 'email' => 'babacar@securechat.com', 'dept' => $fin, 'poste' => 'Comptable'],
            ['name' => 'Rokhaya Thiam', 'email' => 'rokhaya@securechat.com', 'dept' => $fin, 'poste' => 'Analyste Financier'],
            ['name' => 'Mamadou Cissé', 'email' => 'mamadou@securechat.com', 'dept' => $it, 'poste' => 'Développeur Backend'],
            ['name' => 'Aminata Touré', 'email' => 'aminata@securechat.com', 'dept' => $it, 'poste' => 'Développeuse Frontend'],
            ['name' => 'Samba Diallo', 'email' => 'samba@securechat.com', 'dept' => $it, 'poste' => 'Admin Système'],
            ['name' => 'Dieynaba Bâ', 'email' => 'dieynaba@securechat.com', 'dept' => $com, 'poste' => 'Chargée Marketing'],
            ['name' => 'Lamine Ndiaye', 'email' => 'lamine@securechat.com', 'dept' => $com, 'poste' => 'Commercial'],
            ['name' => 'Sokhna Fall', 'email' => 'sokhna@securechat.com', 'dept' => $log, 'poste' => 'Responsable Stock'],
            ['name' => 'Aliou Diop', 'email' => 'aliou@securechat.com', 'dept' => $log, 'poste' => 'Agent Logistique'],
            ['name' => 'Rama Gaye', 'email' => 'rama@securechat.com', 'dept' => $jur, 'poste' => 'Juriste'],
            ['name' => 'Moustapha Niang', 'email' => 'moustapha@securechat.com', 'dept' => $jur, 'poste' => 'Assistant Juridique'],
        ];

        foreach ($employes as $e) {
            User::create([
                'name' => $e['name'],
                'email' => $e['email'],
                'password' => Hash::make('password123'),
                'department_id' => $e['dept']->id,
                'role' => 'employe',
                'poste' => $e['poste'],
            ]);
        }

        // ── Canaux automatiques par département ──
        $departments = Department::all();
        foreach ($departments as $dept) {
            $conversation = Conversation::create([
                'type' => 'group',
                'name' => '#' . strtolower($dept->code) . ' - ' . $dept->name,
            ]);

            $channel = Channel::create([
                'name' => '#' . strtolower($dept->code),
                'description' => 'Canal du département ' . $dept->name,
                'type' => 'private',
                'created_by' => User::where('department_id', $dept->id)->where('role', '!=', 'employe')->first()->id ?? 1,
            ]);

            $conversation->update(['channel_id' => $channel->id]);

            $deptMembers = User::where('department_id', $dept->id)->get();
            foreach ($deptMembers as $member) {
                $channel->members()->attach($member->id, [
                    'role' => in_array($member->role, ['pdg', 'directeur']) ? 'admin' : 'member',
                ]);
                $conversation->users()->attach($member->id);
            }
        }

        // Canal général
        $generalConv = Conversation::create([
            'type' => 'group',
            'name' => '#general - Toute l\'entreprise',
        ]);

        $general = Channel::create([
            'name' => '#general',
            'description' => 'Canal général - Toute l\'entreprise',
            'type' => 'public',
            'created_by' => 1,
        ]);

        $generalConv->update(['channel_id' => $general->id]);

        $allUsers = User::all();
        foreach ($allUsers as $u) {
            $general->members()->attach($u->id, [
                'role' => $u->role === 'pdg' ? 'admin' : 'member',
            ]);
            $generalConv->users()->attach($u->id);
        }

        // Canal direction
        $directionConv = Conversation::create([
            'type' => 'group',
            'name' => '#direction - Réunion de direction',
        ]);

        $direction = Channel::create([
            'name' => '#direction',
            'description' => 'Canal réservé à la direction',
            'type' => 'private',
            'created_by' => 1,
        ]);

        $directionConv->update(['channel_id' => $direction->id]);

        $directeurUsers = User::whereIn('role', ['pdg', 'directeur'])->get();
        foreach ($directeurUsers as $u) {
            $direction->members()->attach($u->id, ['role' => 'admin']);
            $directionConv->users()->attach($u->id);
        }
    }
}
