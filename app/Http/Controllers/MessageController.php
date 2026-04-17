<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Events\MessageSent;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request, Conversation $conversation)
    {
        if (!$conversation->users()->where('users.id', $request->user()->id)->exists()) {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        $messages = $conversation->messages()
            ->with(['user', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($messages);
    }

    public function store(Request $request, Conversation $conversation)
    {
        if (!$conversation->users()->where('users.id', $request->user()->id)->exists()) {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        $request->validate([
            'encrypted_content' => 'required|string',
            'type' => 'nullable|in:text,file,image,system',
        ]);

        $message = $conversation->messages()->create([
            'user_id' => $request->user()->id,
            'encrypted_content' => $request->encrypted_content,
            'type' => $request->type ?? 'text',
        ]);

        $message->load(['user', 'attachments']);

        // Notifier les autres participants
        $recipients = $conversation->users()
            ->where('users.id', '!=', $request->user()->id)
            ->pluck('users.id');

        $preview = mb_substr($request->encrypted_content, 0, 80);
        foreach ($recipients as $rid) {
            \App\Models\Notification::create([
                'user_id' => $rid,
                'type' => 'message',
                'title' => 'Nouveau message de ' . $request->user()->name,
                'body' => $preview,
                'data' => [
                    'conversation_id' => $conversation->id,
                    'message_id' => $message->id,
                    'sender_id' => $request->user()->id,
                ],
            ]);
        }

        event(new MessageSent($message));

        return response()->json($message, 201);
    }

    public function update(Request $request, Message $message)
    {
        if ($message->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        $request->validate([
            'encrypted_content' => 'required|string',
        ]);

        $message->update([
            'encrypted_content' => $request->encrypted_content,
            'edited_at' => now(),
        ]);

        return response()->json($message);
    }

    public function destroy(Request $request, Message $message)
    {
        if ($message->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        $message->delete();

        return response()->json(['message' => 'Message supprimé']);
    }

    public function markAsRead(Request $request, Message $message)
    {
        if ($message->user_id === $request->user()->id) {
            return response()->json(['message' => 'Pas besoin de marquer vos propres messages']);
        }

        $message->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        // Marquer tous les messages précédents comme lus aussi
        $message->conversation->messages()
            ->where('user_id', '!=', $request->user()->id)
            ->where('is_read', false)
            ->where('created_at', '<=', $message->created_at)
            ->update(['is_read' => true, 'read_at' => now()]);

        // Mettre à jour last_read_at dans la table pivot
        $message->conversation->users()->updateExistingPivot($request->user()->id, [
            'last_read_at' => now(),
        ]);

        return response()->json($message);
    }
}
