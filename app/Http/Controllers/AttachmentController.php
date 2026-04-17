<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AttachmentController extends Controller
{
    public function store(Request $request, Message $message)
    {
        if ($message->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        $request->validate([
            'file' => 'required|file|max:10240', // 10 Mo max
            'encrypted_key' => 'nullable|string',
        ]);

        $file = $request->file('file');
        $path = $file->store('attachments', 'local');

        $attachment = $message->attachments()->create([
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'encrypted_key' => $request->encrypted_key,
        ]);

        return response()->json($attachment, 201);
    }

    public function download(Attachment $attachment)
    {
        return Storage::disk('local')->download(
            $attachment->file_path,
            $attachment->file_name
        );
    }

    public function destroy(Request $request, Attachment $attachment)
    {
        if ($attachment->message->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        Storage::disk('local')->delete($attachment->file_path);
        $attachment->delete();

        return response()->json(['message' => 'Fichier supprimé']);
    }
}
