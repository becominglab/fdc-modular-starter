'use client';

/**
 * components/landing/FAQSection.tsx
 * ランディングページのFAQセクション
 */

import styles from './LandingPage.module.css';

export default function FAQSection() {
  return (
    <section id="faq" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTag}>FAQ</div>
          <h2 className={styles.sectionTitle}>よくあるご質問</h2>
        </div>
        <div className={styles.faqAccordion}>
          {/* 一般的な質問 */}
          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>導入には専門知識が必要ですか？</span>
              <svg className={styles.faqIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className={styles.faqAnswer}>
              <p>いいえ、専門知識は不要です。直感的なUIで、ITに詳しくない方でもすぐに使い始められます。Googleワークスペースとの連携も数クリックで完了し、スムーズな導入をサポートします。</p>
            </div>
          </details>
          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>現在使っているタスク管理ツールから乗り換えられますか？</span>
              <svg className={styles.faqIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className={styles.faqAnswer}>
              <p>はい、多くのチームがスムーズに移行しています。FDCはCSVインポート/エクスポート機能を標準で備えており、既存のタスクデータを一括で取り込めます。まずは現在お使いのツールと併用しながら、徐々に移行することも可能です。</p>
            </div>
          </details>
          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>AI機能はいつから使えますか？</span>
              <svg className={styles.faqIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className={styles.faqAnswer}>
              <p>AI機能は現在開発中で、近日実装予定です。大きな目標(Action Item)を具体的なタスク(TODO)に細分化したり、週次の進捗レポートを自動で要約するなど、思考をサポートし面倒な雑務から解放する機能を準備しています。</p>
            </div>
          </details>

          {/* セキュリティ・技術的な質問 */}
          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>セキュリティはどのような基準で設計されていますか？</span>
              <svg className={styles.faqIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className={styles.faqAnswer}>
              <p><strong>IPA（情報処理推進機構）の「非機能要求グレード2018」の6大項目すべてに100%対応しています。</strong></p>
              <p>具体的には：</p>
              <ul className={styles.faqList}>
                <li><strong>暗号化</strong>: AES-256-GCM（2層構造）、HTTPS（TLS 1.3、HSTS有効）</li>
                <li><strong>認証</strong>: Google OAuth 2.0 + PKCE（最新のセキュリティプロトコル）</li>
                <li><strong>認可</strong>: RBAC（役割ベースアクセス制御）+ ワークスペース単位の分離</li>
                <li><strong>入力検証</strong>: Zod v4による厳密なスキーマバリデーション</li>
                <li><strong>脆弱性対策</strong>: OWASP Top 10完全対応（XSS、CSRF、SQLi等）</li>
              </ul>
              <p>これらはすべてコードレベルで実装済みであり、ドキュメントだけの対応ではありません。</p>
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>AIで開発されたシステムは信頼できますか？</span>
              <svg className={styles.faqIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className={styles.faqAnswer}>
              <p><strong>はい。AI支援開発は「品質を下げる」のではなく「品質基準を厳格に適用する」ためのツールです。</strong></p>
              <p>FDCの開発では以下のプラクティスを徹底しています：</p>
              <ul className={styles.faqList}>
                <li><strong>IPA非機能要求グレード2018準拠</strong>: 6大項目（可用性、性能、運用、移行、セキュリティ、環境）すべて100%対応</li>
                <li><strong>コードレビュー</strong>: 人間のシニアエンジニアによる最終レビュー必須</li>
                <li><strong>テスト駆動</strong>: 単体・結合・E2Eテストを自動実行（CI/CD）</li>
                <li><strong>脆弱性スキャン</strong>: npm audit、Dependabot、定期的なセキュリティ監査</li>
                <li><strong>ドキュメント</strong>: 設計書、API仕様書、運用手順書をすべて整備</li>
              </ul>
              <p>「AIが書いたから危険」ではなく、「AIを活用して人間以上に網羅的な品質チェックを実施」しています。</p>
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>技術スタックを教えてください</span>
              <svg className={styles.faqIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className={styles.faqAnswer}>
              <p>モダンで信頼性の高い技術スタックを採用しています：</p>
              <ul className={styles.faqList}>
                <li><strong>フロントエンド</strong>: Next.js 16.0.7（React 19）、TypeScript 5.9、Tailwind CSS</li>
                <li><strong>バックエンド</strong>: Next.js API Routes（Serverless）、Node.js 24.5、Zod（バリデーション）</li>
                <li><strong>データベース</strong>: Supabase（PostgreSQL 17.6）、Row Level Securityは無効化しアプリ層で制御</li>
                <li><strong>インフラ</strong>: Vercel（Edge Network、自動スケーリング）</li>
                <li><strong>認証</strong>: Supabase Auth + Google OAuth 2.0 PKCE</li>
                <li><strong>監視</strong>: Vercel Analytics、Speed Insights、Pino構造化ログ</li>
              </ul>
              <p>すべてTypeScriptで型安全に実装されており、ランタイムエラーを最小化しています。Dependabotによる自動脆弱性監視と、四半期ごとの技術スタックレビューでセキュリティを維持しています。</p>
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>障害発生時の対応体制はどうなっていますか？</span>
              <svg className={styles.faqIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className={styles.faqAnswer}>
              <p><strong>4段階の重要度レベルに応じた対応フローを定義しています：</strong></p>
              <ul className={styles.faqList}>
                <li><strong>P1（Critical）</strong>: 全面停止 → 15分以内に初動、1時間以内に復旧目標</li>
                <li><strong>P2（High）</strong>: 主要機能障害 → 30分以内に初動、4時間以内に復旧目標</li>
                <li><strong>P3（Medium）</strong>: 一部機能影響 → 2時間以内に対応開始</li>
                <li><strong>P4（Low）</strong>: 軽微な問題 → 24時間以内に対応</li>
              </ul>
              <p>Vercelの自動ロールバック機能により、問題発生時は1コマンドで前バージョンに復旧可能です。</p>
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>データのバックアップ・復旧体制は？</span>
              <svg className={styles.faqIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className={styles.faqAnswer}>
              <p><strong>日次自動バックアップ + Point-in-Time Recovery で万全の体制です：</strong></p>
              <ul className={styles.faqList}>
                <li><strong>日次バックアップ</strong>: 毎日03:00 JSTに自動実行、30日間保持</li>
                <li><strong>Point-in-Time Recovery</strong>: 任意の時点（秒単位）へのリストア可能</li>
                <li><strong>RPO（復旧目標点）</strong>: 24時間（最大でも1日分のデータ損失に抑制）</li>
                <li><strong>RTO（復旧目標時間）</strong>: Criticalは1時間、Highは4時間</li>
                <li><strong>災害対策</strong>: リージョン切替手順を文書化済み</li>
              </ul>
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>GDPRや個人情報保護法への対応は？</span>
              <svg className={styles.faqIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className={styles.faqAnswer}>
              <p><strong>GDPR・日本の個人情報保護法に準拠した設計です：</strong></p>
              <ul className={styles.faqList}>
                <li><strong>データ最小化</strong>: 必要最小限の個人情報のみ収集</li>
                <li><strong>アクセス権</strong>: ユーザーは自身のデータをCSVエクスポート可能</li>
                <li><strong>削除権</strong>: アカウント削除時に関連データを完全削除</li>
                <li><strong>同意管理</strong>: 利用規約・プライバシーポリシーへの明示的同意</li>
                <li><strong>監査ログ</strong>: 個人データへのアクセスを2年間記録</li>
              </ul>
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>パフォーマンスの目標値は？</span>
              <svg className={styles.faqIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className={styles.faqAnswer}>
              <p><strong>明確なパフォーマンス目標を設定し、継続的に監視しています：</strong></p>
              <ul className={styles.faqList}>
                <li><strong>API応答時間</strong>: P95 &lt; 350ms（95%のリクエストが350ms以内）</li>
                <li><strong>同時接続数</strong>: 100ユーザー（Starterプラン基準）</li>
                <li><strong>スループット</strong>: 通常20 RPS、ピーク時50 RPS</li>
                <li><strong>ページロード</strong>: LCP &lt; 2.5秒、FID &lt; 100ms</li>
                <li><strong>キャッシュ</strong>: Vercel KV（Redis）による高速化</li>
              </ul>
              <p>月次で負荷テスト（k6使用）を実施し、パフォーマンス劣化を早期検知しています。</p>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
