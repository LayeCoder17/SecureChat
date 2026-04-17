<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\NotificationController;

// Routes publiques
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/departments/list', function () {
    return \App\Models\Department::select('id', 'name', 'code')->orderBy('level')->get();
});

// Routes protégées
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user/profile', [AuthController::class, 'profile']);

    // Broadcasting auth
    Route::post('/broadcasting/auth', function (Request $request) {
        $pusher = new \Pusher\Pusher(
            config('broadcasting.connections.pusher.key'),
            config('broadcasting.connections.pusher.secret'),
            config('broadcasting.connections.pusher.app_id'),
            config('broadcasting.connections.pusher.options') ?? []
        );

        $channelName = $request->input('channel_name');
        $socketId = $request->input('socket_id');

        if (str_starts_with($channelName, 'private-conversation.')) {
            $conversationId = str_replace('private-conversation.', '', $channelName);
            if (!$request->user()->conversations()->where('conversations.id', $conversationId)->exists()) {
                abort(403);
            }
        }

        $auth = $pusher->authorizeChannel($channelName, $socketId);
        return response()->json(json_decode($auth));
    });

    // Users
    Route::get('/users/search', [UserController::class, 'search']);
    Route::put('/user/profile', [UserController::class, 'updateProfile']);
    Route::put('/user/password', [UserController::class, 'updatePassword']);
    Route::post('/user/heartbeat', [UserController::class, 'heartbeat']);
    Route::get('/users/online', [UserController::class, 'onlineUsers']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);
    Route::get('/users/{user}', [UserController::class, 'show']);

    // Conversations
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
    Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy']);

    // Messages
    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'index']);
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);
    Route::put('/messages/{message}', [MessageController::class, 'update']);
    Route::delete('/messages/{message}', [MessageController::class, 'destroy']);
    Route::post('/messages/{message}/read', [MessageController::class, 'markAsRead']);

    // Attachments
    Route::post('/messages/{message}/attachments', [AttachmentController::class, 'store']);
    Route::get('/attachments/{attachment}/download', [AttachmentController::class, 'download']);
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy']);

    // Channels
    Route::get('/channels', [ChannelController::class, 'index']);
    Route::post('/channels', [ChannelController::class, 'store']);
    Route::get('/channels/{channel}', [ChannelController::class, 'show']);
    Route::put('/channels/{channel}', [ChannelController::class, 'update']);
    Route::delete('/channels/{channel}', [ChannelController::class, 'destroy']);
    Route::post('/channels/{channel}/join', [ChannelController::class, 'join']);
    Route::post('/channels/{channel}/leave', [ChannelController::class, 'leave']);

    // ==================== ADMIN ====================
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/stats',                         [AdminController::class, 'stats']);
        // Départements
        Route::get('/departments',                   [AdminController::class, 'listDepartments']);
        Route::post('/departments',                  [AdminController::class, 'storeDepartment']);
        Route::put('/departments/{department}',      [AdminController::class, 'updateDepartment']);
        Route::delete('/departments/{department}',   [AdminController::class, 'destroyDepartment']);
        // Utilisateurs
        Route::get('/users',                         [AdminController::class, 'listUsers']);
        Route::post('/users',                        [AdminController::class, 'storeUser']);
        Route::put('/users/{user}',                  [AdminController::class, 'updateUser']);
        Route::delete('/users/{user}',               [AdminController::class, 'destroyUser']);

        Route::get('/conversations',                 [AdminController::class, 'listConversations']);
        Route::get('/conversations/{conversation}',  [AdminController::class, 'showConversation']);
        Route::delete('/conversations/{conversation}', [AdminController::class, 'destroyConversation']);
    });

    // Departments - filtré par hiérarchie
    Route::get('/departments', function (Request $request) {
        $user = $request->user();

        if ($user->role === 'pdg') {
            return \App\Models\Department::with(['members' => function ($q) use ($user) {
                $q->where('id', '!=', $user->id)
                    ->select('id', 'name', 'email', 'avatar', 'status', 'last_seen_at', 'department_id', 'role', 'poste')
                    ->orderByRaw("CASE role WHEN 'pdg' THEN 0 WHEN 'directeur' THEN 1 WHEN 'chef_service' THEN 2 WHEN 'employe' THEN 3 ELSE 4 END");
            }])->orderBy('level')->get();
        }

        if ($user->role === 'directeur') {
            if ($user->department && $user->department->level === 0) {
                return \App\Models\Department::with(['members' => function ($q) use ($user) {
                    $q->where('id', '!=', $user->id)
                        ->select('id', 'name', 'email', 'avatar', 'status', 'last_seen_at', 'department_id', 'role', 'poste')
                        ->orderByRaw("CASE role WHEN 'pdg' THEN 0 WHEN 'directeur' THEN 1 WHEN 'chef_service' THEN 2 WHEN 'employe' THEN 3 ELSE 4 END");
                }])->orderBy('level')->get();
            }

            $deptIds = collect([$user->department_id, $user->department->parent_id]);
            $commDeptIds = $user->department->canCommunicateWith()->pluck('departments.id');
            $deptIds = $deptIds->merge($commDeptIds)->filter()->unique();

            return \App\Models\Department::whereIn('id', $deptIds)
                ->with(['members' => function ($q) use ($user) {
                    $q->where('id', '!=', $user->id)
                        ->select('id', 'name', 'email', 'avatar', 'status', 'last_seen_at', 'department_id', 'role', 'poste')
                        ->orderByRaw("CASE role WHEN 'pdg' THEN 0 WHEN 'directeur' THEN 1 WHEN 'chef_service' THEN 2 WHEN 'employe' THEN 3 ELSE 4 END");
                }])->orderBy('level')->get();
        }

        if ($user->role === 'chef_service') {
            return \App\Models\Department::where('id', $user->department_id)
                ->with(['members' => function ($q) use ($user) {
                    $q->where('id', '!=', $user->id)
                        ->select('id', 'name', 'email', 'avatar', 'status', 'last_seen_at', 'department_id', 'role', 'poste')
                        ->orderByRaw("CASE role WHEN 'directeur' THEN 1 WHEN 'chef_service' THEN 2 WHEN 'employe' THEN 3 ELSE 4 END");
                }])->get();
        }

        return \App\Models\Department::where('id', $user->department_id)
            ->with(['members' => function ($q) use ($user) {
                $q->where('id', '!=', $user->id)
                    ->select('id', 'name', 'email', 'avatar', 'status', 'last_seen_at', 'department_id', 'role', 'poste')
                    ->orderByRaw("CASE role WHEN 'pdg' THEN 0 WHEN 'directeur' THEN 1 WHEN 'chef_service' THEN 2 WHEN 'employe' THEN 3 ELSE 4 END");
            }])->get();
    });
});
