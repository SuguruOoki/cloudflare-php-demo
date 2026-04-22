/**
 * Cloudflare Email Service ハンドラ
 *
 * `env.SEND_EMAIL.send()` バインディングで任意の宛先に
 * トランザクショナルメールを送信する。
 *
 * 有効化手順:
 *   1. Cloudflare Dashboard で Email Service を有効化
 *   2. 送信元ドメインを verify (SPF / DKIM / DMARC は CF が自動設定)
 *   3. wrangler.jsonc の `send_email` ブロックのコメント解除
 *   4. FROM_EMAIL を verify 済みドメインに書き換え
 *
 * 参考: https://developers.cloudflare.com/email-service/
 */

// -------------------- 型定義 --------------------

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface SendEmailBody {
  to: EmailAddress[];
  from: EmailAddress;
  subject: string;
  text?: string;
  html?: string;
  reply_to?: EmailAddress;
}

/** Cloudflare Email Service の Workers バインディング */
export interface SendEmailBinding {
  send(body: SendEmailBody): Promise<void>;
}

/** クライアントから受け取る POST /api/send-mail のリクエストボディ */
export interface SendMailRequest {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// -------------------- 設定 --------------------

/** 送信元アドレス。**Email Service で verify 済みのドメイン**を設定する。*/
export const FROM_EMAIL: EmailAddress = {
  email: 'no-reply@example.com', // ← 実運用時は verify 済みドメインに変更
  name: 'CF PHP Demo',
};

// -------------------- ハンドラ --------------------

/**
 * POST /api/send-mail のリクエストを処理する。
 *
 * バインディングが未設定の場合は `null` を返すので、呼び出し側で
 * 503 レスポンスを組み立てる。
 */
export async function handleSendMail(
  request: Request,
  binding: SendEmailBinding | undefined
): Promise<Response> {
  if (!binding) {
    return Response.json(
      {
        error: 'Email Service (SEND_EMAIL binding) is not configured',
        how_to_enable:
          'Cloudflare Dashboard で Email Service を有効化し送信元ドメインを verify → ' +
          'wrangler.jsonc の "send_email" ブロックのコメントを外す → deploy',
        docs: 'docs/manual-setup.md',
      },
      { status: 503 }
    );
  }

  const payload = await request.json<SendMailRequest>().catch(() => null);
  if (!payload?.to || !payload.subject) {
    return Response.json(
      { error: 'body must be {"to":"...","subject":"...","text":"..."}' },
      { status: 400 }
    );
  }

  await binding.send({
    to: [{ email: payload.to }],
    from: FROM_EMAIL,
    subject: payload.subject,
    text: payload.text ?? '(empty)',
    html: payload.html,
  });

  return Response.json({ status: 'sent', to: payload.to });
}

// -------------------- 使い方の最小サンプル --------------------

/**
 * バインディングを直接叩く最小サンプル（参考用・import されない）。
 *
 * ```ts
 * await env.SEND_EMAIL.send({
 *   to:      [{ email: 'user@example.com' }],
 *   from:    { email: 'no-reply@your-domain.com', name: 'MyApp' },
 *   subject: 'Welcome!',
 *   text:    'Thanks for signing up.',
 *   html:    '<p>Thanks for signing up.</p>',
 * });
 * ```
 */
export const EXAMPLE_USAGE = null;
