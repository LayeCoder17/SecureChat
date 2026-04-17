<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'type', 'name', 'avatar',
    ];

    public function users()
    {
        return $this->belongsToMany(User::class, 'conversation_user')
            ->withPivot('joined_at', 'last_read_at');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function lastMessage()
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }
}
