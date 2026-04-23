<?php

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;

/**
 * POST /api/login
 * 固定のデモユーザーで Sanctum トークンを発行する。
 */
Route::post('/login', function (Request $request) {
    $credentials = $request->validate([
        'email'    => ['required', 'email'],
        'password' => ['required', 'string'],
    ]);

    $user = User::where('email', $credentials['email'])->first();

    if (! $user || ! Hash::check($credentials['password'], $user->password)) {
        throw ValidationException::withMessages([
            'email' => ['Invalid credentials.'],
        ]);
    }

    $token = $user->createToken('demo-api')->plainTextToken;

    return response()->json([
        'token' => $token,
        'user'  => $user->only(['id', 'name', 'email']),
    ]);
});

/**
 * GET /api/me
 * 認証必須。Cache-Control: private, no-store を明示して
 * CDN / プロキシ層でのキャッシュを禁止する（二重防御の一方）。
 */
Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return response()
        ->json([
            'user'              => $request->user()->only(['id', 'name', 'email']),
            'worker_pid'        => getmypid(),
            'authenticated_at'  => now()->toIso8601String(),
        ])
        ->header('Cache-Control', 'private, no-store');
});
