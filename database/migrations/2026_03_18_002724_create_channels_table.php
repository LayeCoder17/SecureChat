<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('channels', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->enum('type', ['public', 'private'])->default('public');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('avatar')->nullable();
            $table->timestamps();
        });

        // Table pivot : membres du canal
        Schema::create('channel_members', function (Blueprint $table) {
            $table->foreignId('channel_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['admin', 'member'])->default('member');
            $table->timestamp('joined_at')->useCurrent();
            $table->primary(['channel_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('channel_members');
        Schema::dropIfExists('channels');
    }
};
