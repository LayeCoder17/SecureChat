<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $conversations = $user->conversations()
            ->with(['users', 'lastMessage.user'])
            ->get()
            ->map(function ($conv) use ($user) {
                $pivot = $conv->pivot;
                $lastRead = $pivot->last_read_at;

                $unreadCount = $conv->messages()
                    ->where('user_id', '!=', $user->id)
                    ->when($lastRead, function ($q) use ($lastRead) {
                        $q->where('created_at', '>', $lastRead);
                    })
                    ->count();

                $conv->unread_count = $unreadCount;
                return $conv;
            });

        return response()->json($conversations);
    }

    public function store(Request $request)
    {
        $request->validate([
            'type' => 'required|in:private,group',
            'name' => 'nullable|string|max:255',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
        ]);

        if ($request->type === 'private' && count($request->user_ids) === 1) {
            $existing = $request->user()->conversations()
                ->where('type', 'private')
                ->whereHas('users', function ($q) use ($request) {
                    $q->where('users.id', $request->user_ids[0]);
                })
                ->first();

            if ($existing) {
                return response()->json($existing->load('users'));
            }
        }

        $conversation = Conversation::create([
            'type' => $request->type,
            'name' => $request->name,
        ]);

        $userIds = array_merge([$request->user()->id], $request->user_ids);
        $conversation->users()->attach(array_unique($userIds));

        return response()->json($conversation->load('users'), 201);
    }

    public function show(Request $request, Conversation $conversation)
    {
        if (!$conversation->users()->where('users.id', $request->user()->id)->exists()) {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        return response()->json($conversation->load('users'));
    }

    public function destroy(Request $request, Conversation $conversation)
    {
        if (!$conversation->users()->where('users.id', $request->user()->id)->exists()) {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        $conversation->delete();

        return response()->json(['message' => 'Conversation supprimée']);
    }
}
