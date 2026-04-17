<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'code', 'description', 'parent_id', 'level',
    ];

    public function parent()
    {
        return $this->belongsTo(Department::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Department::class, 'parent_id');
    }

    public function members()
    {
        return $this->hasMany(User::class);
    }

    // Départements avec lesquels on peut communiquer
    public function canCommunicateWith()
    {
        return $this->belongsToMany(Department::class, 'department_communications', 'from_department_id', 'to_department_id');
    }
}
