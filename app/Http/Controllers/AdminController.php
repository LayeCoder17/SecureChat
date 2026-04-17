<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    // ============== STATS ==============
    public function stats()
    {
        $msgs24h = DB::table('messages')->where('created_at', '>=', now()->subDay())->count();
        $msgs7d  = DB::table('messages')->where('created_at', '>=', now()->subDays(7))->count();
        $convs   = DB::table('conversations')->count();
        $activeUsers = User::where('last_seen_at', '>=', now()->subMinutes(5))->count();

        // messages par jour (7 derniers jours)
        $series = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i)->startOfDay();
            $next = (clone $day)->addDay();
            $series[] = [
                'date'  => $day->format('Y-m-d'),
                'label' => $day->isoFormat('ddd'),
                'total' => DB::table('messages')->whereBetween('created_at', [$day, $next])->count(),
            ];
        }

        return response()->json([
            'users'         => User::count(),
            'active_users'  => $activeUsers,
            'departments'   => Department::count(),
            'conversations' => $convs,
            'messages_24h'  => $msgs24h,
            'messages_7d'   => $msgs7d,
            'series'        => $series,
            'by_role'     => User::select('role', DB::raw('count(*) as total'))
                ->groupBy('role')->pluck('total', 'role'),
            'by_department' => Department::withCount('members')->get()
                ->map(fn($d) => ['name' => $d->name, 'code' => $d->code, 'total' => $d->members_count]),
        ]);
    }

    // ============== CONVERSATIONS (qui parle à qui) ==============
    public function listConversations(Request $request)
    {
        $q = \App\Models\Conversation::with(['users:id,name,email,role,department_id', 'users.department:id,name,code'])
            ->withCount('messages')
            ->withMax('messages', 'created_at');

        if ($s = $request->get('q')) {
            $q->whereHas('users', function ($w) use ($s) {
                $w->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%");
            });
        }
        if ($type = $request->get('type')) $q->where('type', $type);

        return $q->orderByDesc('messages_max_created_at')->paginate(20);
    }

    public function showConversation(\App\Models\Conversation $conversation)
    {
        $conversation->load(['users:id,name,email,role,avatar', 'users.department:id,name,code']);
        $messages = $conversation->messages()
            ->with('user:id,name,role')
            ->orderByDesc('created_at')->limit(50)->get();
        return response()->json([
            'conversation' => $conversation,
            'messages'     => $messages,
            'total_messages' => $conversation->messages()->count(),
        ]);
    }

    public function destroyConversation(\App\Models\Conversation $conversation)
    {
        $conversation->delete();
        return response()->json(['message' => 'Conversation supprimée']);
    }

    // ============== DEPARTMENTS ==============
    public function listDepartments()
    {
        return Department::withCount('members')
            ->with('parent:id,name,code')
            ->orderBy('level')->orderBy('name')->get();
    }

    public function storeDepartment(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255|unique:departments,name',
            'code'        => 'required|string|max:20|unique:departments,code',
            'description' => 'nullable|string',
            'parent_id'   => 'nullable|exists:departments,id',
            'level'       => 'nullable|integer|min:0',
        ]);
        $data['level'] = $data['level'] ?? ($data['parent_id'] ? 1 : 0);
        $dept = Department::create($data);
        return response()->json($dept, 201);
    }

    public function updateDepartment(Request $request, Department $department)
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:255|unique:departments,name,' . $department->id,
            'code'        => 'sometimes|string|max:20|unique:departments,code,' . $department->id,
            'description' => 'nullable|string',
            'parent_id'   => 'nullable|exists:departments,id',
            'level'       => 'nullable|integer|min:0',
        ]);
        $department->update($data);
        return response()->json($department);
    }

    public function destroyDepartment(Department $department)
    {
        if ($department->members()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer : des utilisateurs sont rattachés à ce département.'
            ], 422);
        }
        $department->delete();
        return response()->json(['message' => 'Département supprimé']);
    }

    // ============== USERS ==============
    public function listUsers(Request $request)
    {
        $q = User::with('department:id,name,code');
        if ($s = $request->get('q')) {
            $q->where(function ($w) use ($s) {
                $w->where('name', 'like', "%$s%")
                  ->orWhere('email', 'like', "%$s%")
                  ->orWhere('poste', 'like', "%$s%");
            });
        }
        if ($role = $request->get('role'))      $q->where('role', $role);
        if ($dept = $request->get('department_id')) $q->where('department_id', $dept);

        return $q->orderBy('name')->paginate(20);
    }

    public function storeUser(Request $request)
    {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'password'      => 'required|string|min:8',
            'role'          => 'required|in:pdg,directeur,chef_service,employe,admin',
            'department_id' => 'nullable|exists:departments,id',
            'poste'         => 'nullable|string|max:255',
        ]);
        $data['password'] = Hash::make($data['password']);
        $user = User::create($data);
        return response()->json($user->load('department'), 201);
    }

    public function updateUser(Request $request, User $user)
    {
        $data = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'email'         => 'sometimes|email|unique:users,email,' . $user->id,
            'password'      => 'nullable|string|min:8',
            'role'          => 'sometimes|in:pdg,directeur,chef_service,employe,admin',
            'department_id' => 'nullable|exists:departments,id',
            'poste'         => 'nullable|string|max:255',
        ]);
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        $user->update($data);
        return response()->json($user->load('department'));
    }

    public function destroyUser(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas vous supprimer vous-même.'], 422);
        }
        $user->delete();
        return response()->json(['message' => 'Utilisateur supprimé']);
    }
}
