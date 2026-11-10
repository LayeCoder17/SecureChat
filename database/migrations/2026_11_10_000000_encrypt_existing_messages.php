<?php

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/**
 * Les messages étaient stockés en clair. Le modèle Message les chiffre
 * désormais (cast « encrypted ») : cette migration chiffre ceux qui
 * existent déjà, et laisse intacts ceux qui le sont.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('messages')->whereNotNull('encrypted_content')->orderBy('id')
            ->chunkById(500, function ($messages) {
                foreach ($messages as $message) {
                    try {
                        Crypt::decryptString($message->encrypted_content);
                    } catch (DecryptException) {
                        DB::table('messages')->where('id', $message->id)->update([
                            'encrypted_content' => Crypt::encryptString($message->encrypted_content),
                        ]);
                    }
                }
            });
    }

    public function down(): void
    {
        DB::table('messages')->whereNotNull('encrypted_content')->orderBy('id')
            ->chunkById(500, function ($messages) {
                foreach ($messages as $message) {
                    try {
                        DB::table('messages')->where('id', $message->id)->update([
                            'encrypted_content' => Crypt::decryptString($message->encrypted_content),
                        ]);
                    } catch (DecryptException) {
                        // déjà en clair
                    }
                }
            });
    }
};
