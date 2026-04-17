<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Channel;
use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|unique:users',
            'password' => ['required', 'confirmed', Password::min(8)],
            'public_key' => 'nullable|string',
            'department_id' => 'required|exists:departments,id',
            'role' => 'required|in:pdg,directeur,chef_service,employe',
            'poste' => 'required|string|max:255',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'public_key' => $request->public_key,
            'department_id' => $request->department_id,
            'role' => $request->role,
            'poste' => $request->poste,
        ]);

        // Ajouter au canal du département
        $dept = $user->department;
        if ($dept) {
            $deptChannel = Channel::where('name', '#' . strtolower($dept->code))->first();
            if ($deptChannel) {
                $deptChannel->members()->attach($user->id, ['role' => 'member']);
                $conv = Conversation::where('channel_id', $deptChannel->id)->first();
                if ($conv) $conv->users()->attach($user->id);
            }
        }

        // Ajouter au canal général
        $generalChannel = Channel::where('name', '#general')->first();
        if ($generalChannel) {
            $generalChannel->members()->attach($user->id, ['role' => 'member']);
            $conv = Conversation::where('channel_id', $generalChannel->id)->first();
            if ($conv) $conv->users()->attach($user->id);
        }

        // Si directeur ou PDG, ajouter au canal direction
        if (in_array($request->role, ['pdg', 'directeur'])) {
            $dirChannel = Channel::where('name', '#direction')->first();
            if ($dirChannel) {
                $dirChannel->members()->attach($user->id, ['role' => 'admin']);
                $conv = Conversation::where('channel_id', $dirChannel->id)->first();
                if ($conv) $conv->users()->attach($user->id);
            }
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->load('department'),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'Identifiants incorrects',
            ], 401);
        }

        $user = Auth::user();
        $user->update(['status' => 'online', 'last_seen_at' => now()]);
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->load('department'),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->update(['status' => 'offline', 'last_seen_at' => now()]);
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Déconnexion réussie',
        ]);
    }

    public function profile(Request $request)
    {
        return response()->json($request->user()->load('department'));
    }
}
