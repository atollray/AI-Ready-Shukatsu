import type { WorkspaceData } from "@/lib/types";

export function createDefaultWorkspaceData(): WorkspaceData {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // 日付ユーティリティ
  const daysFromToday = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  return {
    version: 1,
    updatedAt: now,

    // =====================================================================
    // サンプルプロフィール（架空・個人情報なし）
    // =====================================================================
    profile: {
      name: "山田 太郎",
      school: "サンプル大学 情報学部 情報工学科",
      graduationYear: "2026",
      desiredRoles: [
        "バックエンドエンジニア",
        "Webエンジニア（フルスタック）",
        "新規事業開発エンジニア",
      ],
      desiredIndustries: [
        "SaaS・Webサービス（自社開発）",
        "AI・LLM活用スタートアップ",
        "HR Tech / EdTech",
      ],
      domainInterests: ["教育・学習支援", "医療・ヘルスケア", "エンタメ・クリエイター支援"],
      strengths: [
        "課題発見から最速プロトタイプへの落とし込み力",
        "チームの仕様を整理してドキュメント化する習慣",
        "新技術のキャッチアップ速度",
      ],
      priorities: [
        "技術選定・アーキテクチャ設計に関われる裁量",
        "若手が積極的に提案・実装できる文化",
        "プロダクト志向（受託ではなく自社開発）",
      ],
      workingPreferences:
        "スモールチームで裁量広く動きたい。泥臭い運用も経験しながら、新機能提案の機会もある環境が理想。リモート可であればなお良い。",
      careerVision: {
        shortTerm: "新卒1〜2年目：実装・設計の基礎を積み、チームに貢献できる即戦力になる",
        midTerm: "3〜5年目：技術リードとして設計・レビュー・採用に関与する",
        longTerm: "プレイングマネージャー or CTO候補として、事業と技術を両輪で推進する",
      },
      weeklyFocus:
        "1. 株式会社テックグロースの一次面接対策\n2. サンプルコーポレーションのES設問を仕上げる\n3. 自己PRの最終版を完成させる",
      memo:
        "【就活の軸】\n1. 自社プロダクトを持ち、エンジニアが事業に近い意思決定に関われる環境\n2. 技術的負債を放置せず、品質と速度を両立しようとする文化\n3. 若手のうちに0→1の経験が積める機会があること\n\n【逆質問のネタ帳】\n- 現在の技術スタック・今後の変更予定はあるか？\n- 新卒に最初にアサインしやすいタスクはどんなものか？\n- 年間を通じての開発サイクル（リリース・スプリント）は？",
    },

    // =====================================================================
    // サンプルタスク
    // =====================================================================
    tasks: [
      {
        id: "task-001",
        title: "株式会社テックグロース 一次面接対策",
        state: "doing",
        dueDate: daysFromToday(3),
        relatedCompanyId: "company-001",
        notes:
          "技術面接を想定。データ構造・アルゴリズムの基礎 + 過去のOSSコントリビューション経験を整理しておく。",
      },
      {
        id: "task-002",
        title: "サンプルコーポレーション ES提出",
        state: "todo",
        dueDate: daysFromToday(7),
        relatedCompanyId: "company-002",
        notes: "「あなたが最も苦労した開発経験」の設問。500字以内。",
      },
      {
        id: "task-003",
        title: "自己PR最終版の作成",
        state: "doing",
        dueDate: daysFromToday(5),
        relatedCompanyId: "",
        notes: "汎用版（300字）と詳細版（600字）の2パターンを仕上げる。",
      },
      {
        id: "task-004",
        title: "フューチャーウェブ株式会社 説明会参加",
        state: "todo",
        dueDate: daysFromToday(10),
        relatedCompanyId: "company-003",
        notes: "オンライン開催。Zoom URL は採用ページに掲載予定。事前質問を3個準備する。",
      },
      {
        id: "task-005",
        title: "業界研究まとめをノートに書く",
        state: "done",
        dueDate: daysFromToday(-2),
        relatedCompanyId: "",
        notes: "SaaS 市場規模・ARR モデルの理解、競合比較をまとめた。",
      },
    ],

    // =====================================================================
    // サンプル企業
    // =====================================================================
    companies: [
      {
        id: "company-001",
        slug: "tech-growth",
        name: "株式会社テックグロース",
        industry: "SaaS・Webサービス",
        stage: "interview",
        priority: "high",
        interestScore: 5,
        fitScore: 4,
        applicationUrl: "https://example.com/apply/tech-growth",
        careersUrl: "https://example.com/careers/tech-growth",
        headquarters: "東京都渋谷区",
        tags: ["自社開発", "エンジニア採用積極", "フルリモート可", "スタートアップ"],
        motivation:
          "プロダクトドリブンな組織文化と、エンジニアが事業戦略に近い場所で働ける環境に強く共感している。特に「エンジニアが提案した機能が翌月にリリースされた」という事例を採用ページで読み、自分のキャリアビジョンと重なると感じた。",
        sellingPoints:
          "・ユーザーインタビューをエンジニアも同席して行う文化\n・技術選定はチーム全員が参加する RFC プロセス\n・年4回の技術カンファレンス参加支援",
        concerns:
          "急成長中のため、ドキュメント整備が追いついていない可能性がある。入社後の onboarding 体制を面接で確認したい。",
        conditions: "フルリモート可。月1程度の東京オフィス出社あり。",
        nextAction: "一次面接（技術面接）の準備。LeetCode Medium 10問を解く。",
        notes:
          "OB訪問で「若手でも技術提案の機会が多い」と聞いた。人事担当の田中さんが非常に丁寧な対応で印象が良かった。",
        updatedAt: now,
        esEntries: [
          {
            id: "es-001",
            title: "あなたが最も困難だったプロジェクトを教えてください",
            question:
              "学生時代に直面した最も困難なプロジェクトと、それをどう克服したかを600字以内で述べてください。",
            draft:
              "学部3年次に取り組んだ卒業研究の中間発表で、実装が間に合わないという問題に直面しました。チームメンバーとの役割分担を見直し、毎日30分の進捗共有を設けることで、発表2日前に形にすることができました。この経験から「早期の問題顕在化と細かい同期」の重要性を学びました。",
            status: "review",
            deadline: daysFromToday(7),
          },
        ],
        events: [
          {
            id: "event-001",
            title: "一次面接（技術面接）",
            type: "interview",
            date: daysFromToday(3),
            location: "Zoom（URL送付済み）",
            notes: "60分。前半30分コーディング、後半30分質疑。",
          },
          {
            id: "event-002",
            title: "最終面接",
            type: "interview",
            date: daysFromToday(14),
            location: "渋谷オフィス",
            notes: "代表との面接が予定されている。",
          },
        ],
        contacts: [
          {
            id: "contact-001",
            name: "田中 採子（仮）",
            role: "HRマネージャー",
            channel: "email",
            email: "recruit@example-tech-growth.com",
            notes: "選考連絡は基本メール。返信が早い。",
          },
        ],
        interviews: [
          {
            id: "interview-001",
            round: "書類選考",
            date: daysFromToday(-10),
            format: "書類",
            outcome: "通過",
            questions: "",
            reflections: "ポートフォリオが評価された模様。",
          },
        ],
        documents: [],
      },

      {
        id: "company-002",
        slug: "sample-corporation",
        name: "サンプルコーポレーション株式会社",
        industry: "HR Tech",
        stage: "es",
        priority: "high",
        interestScore: 4,
        fitScore: 4,
        applicationUrl: "https://example.com/apply/sample-corp",
        careersUrl: "https://example.com/careers/sample-corp",
        headquarters: "東京都新宿区",
        tags: ["HR Tech", "BtoB SaaS", "上場", "安定成長"],
        motivation:
          "採用管理 SaaS のリーディングカンパニーとして、数十万社に使われるプロダクトの開発に携われる点が魅力。上場企業ながらプロダクト開発の速度が速く、エンジニアが事業に近い姿勢を維持しているとの評判。",
        sellingPoints:
          "・利用企業数が多く、大規模サービスの運用経験が積める\n・エンジニア向け研修制度が充実\n・フレックス+リモートワーク可",
        concerns:
          "組織規模が大きくなり、個人の裁量が狭くなっていないか確認が必要。チームのコードレビュー文化についても聞きたい。",
        conditions: "週3リモート可。フレックスタイム制。",
        nextAction: "ES最終確認のうえ提出する。",
        notes: "学校の OB が1名在籍している。機会があれば話を聞きたい。",
        updatedAt: now,
        esEntries: [
          {
            id: "es-002",
            title: "志望動機",
            question:
              "当社を志望する理由と、入社後にどのような貢献ができるかを400字以内で述べてください。",
            draft:
              "採用管理という、企業と人材の出会いを支えるプロダクトに共感しています。技術の力でこの課題を解決することが社会的意義につながると考え志望しました。入社後は、バックエンドAPIの設計・実装を中心に貢献し、3年後には機能提案ができるエンジニアを目指します。",
            status: "draft",
            deadline: daysFromToday(7),
          },
          {
            id: "es-003",
            title: "ガクチカ",
            question:
              "学生時代に最も力を入れたことを500字以内で教えてください。",
            draft: "",
            status: "idea",
            deadline: daysFromToday(7),
          },
        ],
        events: [
          {
            id: "event-003",
            title: "ES締め切り",
            type: "deadline",
            date: daysFromToday(7),
            location: "",
            notes: "マイページから提出。",
          },
          {
            id: "event-004",
            title: "オンライン会社説明会",
            type: "seminar",
            date: daysFromToday(2),
            location: "Teams（招待済み）",
            notes: "エンジニア向け技術説明会。アーキテクチャの話が聞けるはず。",
          },
        ],
        contacts: [],
        interviews: [],
        documents: [],
      },

      {
        id: "company-003",
        slug: "future-web",
        name: "フューチャーウェブ株式会社",
        industry: "Webサービス・メディア",
        stage: "researching",
        priority: "medium",
        interestScore: 3,
        fitScore: 3,
        applicationUrl: "",
        careersUrl: "https://example.com/careers/future-web",
        headquarters: "大阪府大阪市北区",
        tags: ["メディア", "大阪本社", "フルスタック募集"],
        motivation:
          "コンテンツメディアとWebシステムを掛け合わせたビジネスモデルに興味がある。関西拠点という点も評価ポイント。",
        sellingPoints: "・コンテンツ×テクノロジーの独自ポジション\n・関西最大規模のWebエンジニアチーム",
        concerns:
          "採用ページの情報が少ない。技術スタックが古い可能性も。説明会で確認したい。",
        conditions: "大阪勤務メイン（リモート状況は不明）。",
        nextAction: "説明会参加後、応募するか判断する。",
        notes: "Wantedly でエンジニアブログを読んだ。技術記事が充実していて好印象。",
        updatedAt: now,
        esEntries: [],
        events: [
          {
            id: "event-005",
            title: "エンジニア向け説明会",
            type: "seminar",
            date: daysFromToday(10),
            location: "Zoom（URLは採用ページに掲載予定）",
            notes: "事前質問を3個準備する。技術スタック・チーム規模・リモート方針を確認。",
          },
        ],
        contacts: [],
        interviews: [],
        documents: [],
      },
    ],

    // =====================================================================
    // サンプルノート
    // =====================================================================
    journalEntries: [
      {
        id: "journal-001",
        date: today,
        title: "このアプリの使い方メモ",
        relatedCompanyId: "",
        content:
          "企業ごとの情報・ES・面接メモ・イベント予定をここに集約する。右上の「保存する」を押すと `data/` 配下に JSON と Markdown が自動生成され、AIエージェントが読み取りやすい形式で出力される。\n\nまずは「設定」タブから自分のプロフィールを本物の情報で上書きしよう。",
      },
      {
        id: "journal-002",
        date: daysFromToday(-3),
        title: "テックグロース OB訪問まとめ",
        relatedCompanyId: "company-001",
        content:
          "在籍1年目のエンジニアと30分話した。\n\n- 入社後すぐに一部機能の設計に参加できた\n- 毎週金曜に社内 LT があり、新技術を気軽に紹介できる文化\n- 残業は月平均20時間程度\n- 技術負債の返済に四半期ごとのイテレーションを割いている点が好印象\n\n→ かなり志望度が上がった。一次面接の準備を全力でやる。",
      },
      {
        id: "journal-003",
        date: daysFromToday(-7),
        title: "業界研究：SaaS ビジネスモデルの基礎",
        relatedCompanyId: "",
        content:
          "SaaS 志望のために基礎を整理した。\n\n**ARR（年間経常収益）**：月次サブスクリプション収益×12。投資家が最も重視する指標。\n**NRR（ネットレベニューリテンション）**：既存顧客からの収益維持・拡大率。100%超えが理想。\n**CAC（顧客獲得コスト）**と**LTV（顧客生涯価値）**のバランス：LTV/CAC > 3 が健全の目安。\n\nこれらの指標を面接で自然に使えるようにしておく。",
      },
    ],
  };
}
