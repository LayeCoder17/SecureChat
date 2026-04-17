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
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique(); // ex: DG, RH, FIN, IT
            $table->text('description')->nullable();
            $table->unsignedBigInteger('parent_id')->nullable(); // hiérarchie entre départements
            $table->foreign('parent_id')->references('id')->on('departments')->nullOnDelete();
            $table->integer('level')->default(0); // 0 = DG, 1 = directions, 2 = services
            $table->timestamps();
        });

        // Table des droits de communication entre départements
        Schema::create('department_communications', function (Blueprint $table) {
            $table->foreignId('from_department_id')->constrained('departments')->cascadeOnDelete();
            $table->foreignId('to_department_id')->constrained('departments')->cascadeOnDelete();
            $table->primary(['from_department_id', 'to_department_id']);
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('department_communications');
        Schema::dropIfExists('departments');
    }
};
