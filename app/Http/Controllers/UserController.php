<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    public function search(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2',
        ]);

        $user = $request->user();
        $query = $user->canCommunicateWith();

        $driver = \DB::connection()->getDriverName();
        $likeOp = $driver === 'pgsql' ? 'ilike' : 'like';
        $term = '%' . $request->q . '%';

        $results = $query->where(function ($q) use ($term, $likeOp) {
            $q->where('name', $likeOp, $term)
                ->orWhere('email', $likeOp, $term)
                ->orWhere('poste', $likeOp, $term);
        })
            ->limit(20)
            ->get(['id', 'name', 'email', 'avatar', 'status', 'last_seen_at', 'department_id', 'role', 'poste']);

        $results->load('department');

        return response()->json($results);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'name' => 'nullable|string|max:255',
            'avatar' => 'nullable|image|max:2048',
        ]);

        $user = $request->user();

        if ($request->has('name')) {
            $user->name = $request->name;
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('local')->delete($user->avatar);
            }
            $user->avatar = $request->file('avatar')->store('avatars', 'local');
        }

        $user->save();

        return response()->json($user);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if (!Hash::check($request->current_password, $request->user()->password)) {
            return response()->json(['message' => 'Mot de passe actuel incorrect'], 403);
        }

        $request->user()->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json(['message' => 'Mot de passe mis à jour']);
    }

    public function show(User $user)
    {
        return response()->json($user->load('department')->only([
            'id', 'name', 'email', 'avatar', 'status', 'last_seen_at', 'department_id', 'role', 'poste', 'department',
        ]));
    }
}
