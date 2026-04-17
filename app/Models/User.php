<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'avatar', 'public_key', 'status', 'last_seen_at', 'department_id', 'role', 'poste',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function conversations()
    {
        return $this->belongsToMany(Conversation::class, 'conversation_user')
            ->withPivot('joined_at', 'last_read_at');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function channels()
    {
        return $this->belongsToMany(Channel::class, 'channel_members')
            ->withPivot('role', 'joined_at');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function canCommunicateWith()
    {
        if ($this->role === 'pdg') {
            return User::where('id', '!=', $this->id);
        }

        if ($this->role === 'directeur') {
            // DG voit tout comme le PDG
            if ($this->department && $this->department->level === 0) {
                return User::where('id', '!=', $this->id);
            }

            return User::where('id', '!=', $this->id)
                ->where(function ($q) {
                    $q->where('department_id', $this->department_id)
                        ->orWhere('role', 'pdg')
                        ->orWhere('role', 'directeur')
                        ->orWhereIn('department_id', $this->department->canCommunicateWith()->pluck('departments.id'));
                });
        }

        if ($this->role === 'chef_service') {
            return User::where('id', '!=', $this->id)
                ->where('department_id', $this->department_id);
        }

        return User::where('id', '!=', $this->id)
            ->where('department_id', $this->department_id);
    }
}
