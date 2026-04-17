<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\Conversation;
use Illuminate\Http\Request;

class ChannelController extends Controller
{
    public function index(Request $request)
    {
        $channels = $request->user()->channels()
            ->with('creator')
            ->withCount('members')
            ->get();

        return response()->json($channels);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:channels',
            'description' => 'nullable|string',
            'type' => 'nullable|in:public,private',
        ]);

        $channel = Channel::create([
            'name' => $request->name,
            'description' => $request->description,
            'type' => $request->type ?? 'public',
            'created_by' => $request->user()->id,
        ]);

        $channel->members()->attach($request->user()->id, [
            'role' => 'admin',
        ]);

        return response()->json($channel->load('members'), 201);
    }

    public function show(Channel $channel)
    {
        return response()->json($channel->load(['creator', 'members']));
    }

    public function update(Request $request, Channel $channel)
    {
        $member = $channel->members()->where('users.id', $request->user()->id)->first();

        if (!$member || $member->pivot->role !== 'admin') {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        $request->validate([
            'name' => 'nullable|string|max:255|unique:channels,name,' . $channel->id,
            'description' => 'nullable|string',
            'type' => 'nullable|in:public,private',
        ]);

        $channel->update($request->only('name', 'description', 'type'));

        return response()->json($channel);
    }

    public function destroy(Request $request, Channel $channel)
    {
        $member = $channel->members()->where('users.id', $request->user()->id)->first();

        if (!$member || $member->pivot->role !== 'admin') {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        $channel->delete();

        return response()->json(['message' => 'Canal supprimé']);
    }

    public function join(Request $request, Channel $channel)
    {
        if ($channel->members()->where('users.id', $request->user()->id)->exists()) {
            return response()->json(['message' => 'Déjà membre']);
        }

        if ($channel->type === 'private') {
            return response()->json(['message' => 'Canal privé, invitation requise'], 403);
        }

        $channel->members()->attach($request->user()->id, [
            'role' => 'member',
        ]);

        return response()->json(['message' => 'Vous avez rejoint le canal']);
    }

    public function leave(Request $request, Channel $channel)
    {
        $channel->members()->detach($request->user()->id);

        return response()->json(['message' => 'Vous avez quitté le canal']);
    }
}
