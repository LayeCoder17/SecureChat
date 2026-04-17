<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'message_id', 'file_name', 'file_path', 'file_size', 'mime_type', 'encrypted_key',
    ];

    public function message()
    {
        return $this->belongsTo(Message::class);
    }
}
