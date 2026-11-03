import type { Company, NoteItem, ProfileData, TaskItem } from "../schema";

export function createSampleProfile(): ProfileData {
  return {
    name: "就活 太郎",
    school: "情報科学大学 情報工学部",
    graduationYear: "2027年卒",
    desiredRoles: ["Webエンジニア", "プロダクトマネージャー"],
    desiredIndustries: ["SaaS / クラウド", "ITコンサルティング"],
    domainInterests: ["開発者体験 (DX)", "生成AI活用", "生産性向上ツール"],
    strengths: [
      "自走力とキャッチアップの速さ（ハッカソンでの開発経験）",
      "チームの課題を特定して仕組み化する推進力",
    ],
    priorities: [
      "若手から裁量を持ってプロダクト開発・意思決定に関われる環境",
      "エンジニアとビジネス職が対等に議論するカルチャー",
      "技術的チャレンジと事業インパクトの両立",
    ],
    workingPreferences: "フルリモートまたはハイブリッド勤務、フレックスタイム制",
    careerVision: {
      shortTerm: "1〜3年目: 自社プロダクトのコア機能開発を主導し、フルスタックな技術力を磨く",
      midTerm:
        "4〜6年目: テックリードまたはスクラムマスターとしてチームを牽引し、アーキテクチャ設計を担う",
      longTerm:
        "7年目以降: VPoEやプロダクト責任者として事業成長に直結するエンジニアリング組織を創る",
    },
    weeklyFocus:
      "- テックフロンティアの2次面接準備（深掘り想定問答の壁打ち）\n- コンサル系のWEBテスト対策（非言語中心）",
    memo: "面接では『なぜ他社ではなくこの会社なのか』の具体例を自分の原体験と結びつけて話すことを意識する。",
    updatedAt: new Date().toISOString(),
  };
}

export function createSampleCompanies(): Company[] {
  const now = new Date().toISOString();
  return [
    {
      id: "co_sample_tech",
      rev: 1,
      updatedAt: now,
      isSample: true,
      name: "テックフロンティア株式会社",
      industry: "BtoB SaaS / クラウド",
      headquarters: "東京都渋谷区",
      urls: {
        careers: "https://example.com/tech-frontier/recruit",
        application: "https://example.com/tech-frontier/mypage",
      },
      tags: ["自社開発", "モダン技術スタック", "フルリモート可", "急成長メガベンチャー"],
      stage: "interview",
      currentTrack: "本選考",
      stageHistory: [
        {
          at: new Date(Date.now() - 14 * 86400000).toISOString(),
          track: "本選考",
          from: "researching",
          to: "applied",
        },
        {
          at: new Date(Date.now() - 7 * 86400000).toISOString(),
          track: "本選考",
          from: "applied",
          to: "interview",
        },
      ],
      interestScore: 5,
      fitScore: 4,
      motivation:
        "自社開発SaaSを通じて日本企業のDXを支援する点に強く共感。エンジニアがユーザーと直接対話しながら高速に機能改善を行う文化があり、自身の強みである自走力とアジリティを最大化できると考え志望。",
      sellingPoints:
        "GraphQLやGo、Next.jsなどモダンな技術選定。1人1人の開発裁量が大きく、PdMとの距離が近い。フルリモート・コアタイムなしフレックス。",
      concerns:
        "急成長中のためオンボーディングやドキュメントが一部整備中。自ら情報を取りに行く姿勢が強く求められる。",
      conditions: "初任給36万円（固定残業代含む）、家賃補助月3万円、リモート手当あり",
      memo: "面接官（開発部長）の印象が非常に良かった。チーム開発でのコンフリクト解決経験について深く聞かれた。",
      esEntries: [
        {
          id: "es_sample_tech_1",
          title: "学生時代に最も打ち込んだこと（400字）",
          question:
            "学生時代に最も情熱を持って取り組んだことと、そこから得た学びを記述してください。（400字以内）",
          draft:
            "大学祭のオンライン整理券システムを3名のチームで開発・運用したことです。前年に発生した待機列の混雑とクレームを解決するため、LINE公式アカウントと連携したリアルタイム発券アプリを構築しました。私はフロントエンド開発と負荷対策を担当し、過去のピーク時アクセス数を分析して負荷分散の設計を行いました。当日は3日間で約1万人の利用があり、待機時間を平均70%短縮できました。この経験から、技術は課題解決の手段であり、ユーザー目線に立った要件定義とチーム連携の重要性を学びました。",
          status: "submitted",
          deadline: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
          track: "本選考",
          charLimit: 400,
        },
      ],
      events: [
        {
          id: "ev_sample_tech_1",
          kind: "interview",
          title: "1次面接（現場エンジニア）",
          start: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10) + "T14:00",
          durationMin: 45,
          location: "Google Meet",
          track: "本選考",
          notes: "ハッカソンでの開発経験と技術選定の理由を中心に質問された。終始和やかな雰囲気。",
          interview: {
            round: "1次面接",
            format: "オンライン / 1対1",
            questions:
              "自己紹介、学生時代注力した開発、なぜGo/Next.jsを選んだのか、チーム開発で困難だったこと",
            reflections:
              "技術的なアピールはできたが、事業に対する興味の具体例をもっと話せると良かった。",
            outcome: "通過（翌日通過連絡あり）",
          },
        },
        {
          id: "ev_sample_tech_2",
          kind: "interview",
          title: "2次面接（開発部長）",
          start: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) + "T16:00",
          durationMin: 60,
          location: "Google Meet",
          track: "本選考",
          notes:
            "逆質問を3点用意して臨む。会社のロードマップとエンジニア組織の評価制度について聞く。",
          interview: {
            round: "2次面接",
            format: "オンライン / 1対1",
            questions: "",
            reflections: "",
            outcome: "",
          },
        },
      ],
      contacts: [
        {
          id: "ct_sample_tech_1",
          name: "佐藤 健太",
          role: "新卒採用担当 / 人事部",
          channel: "メール",
          email: "recruit@tech-frontier.example.com",
          notes: "カジュアル面談を担当してくれた方。返信が非常に早い。",
        },
      ],
      documents: [
        {
          id: "dc_sample_tech_1",
          label: "提出済みポートフォリオ (GitHub)",
          path: "https://github.com/example/portfolio",
          notes: "1次面接前に提出済み",
        },
      ],
    },
    {
      id: "co_sample_consulting",
      rev: 1,
      updatedAt: now,
      isSample: true,
      name: "グローバル・イノベーション・コンサルティング株式会社",
      industry: "ITコンサルティング / 戦略DX",
      headquarters: "東京都千代田区大手町",
      urls: {
        careers: "https://example.com/gic/careers",
        application: "https://example.com/gic/apply",
      },
      tags: ["グローバル", "DXコンサル", "高年収", "研修充実"],
      stage: "applied",
      currentTrack: "早期選考",
      stageHistory: [
        {
          at: new Date(Date.now() - 3 * 86400000).toISOString(),
          track: "早期選考",
          from: "researching",
          to: "applied",
        },
      ],
      interestScore: 4,
      fitScore: 3,
      motivation:
        "大企業の基幹システム刷新や新規事業創出に最上流から携われる点に魅力。技術への理解を武器に、ビジネスとITの架け橋となるコンサルタントを目指したい。",
      sellingPoints: "平均年収が高く、若手から大規模プロジェクトに参画可能。海外研修制度が充実。",
      concerns: "繁忙期の残業時間が長め。顧客先の常駐案件が多い。",
      conditions: "初任給38万円、賞与年2回、住宅手当月4万円",
      memo: "WEBテスト（SPI）の結果が重視される。志望動機よりも論理的思考力と地頭が評価される傾向。",
      esEntries: [
        {
          id: "es_sample_gic_1",
          title: "志望理由と入社後に成し遂げたいこと（500字）",
          question:
            "当社を志望する理由と、当社であなたが成し遂げたい変革について記述してください。（500字以内）",
          draft:
            "貴社が強みとする『戦略から実装までの一気通貫支援』を通じて、日本の伝統産業のDXを加速させたいと考え志望します。私は大学でIT技術を学ぶ傍ら、中小企業の業務効率化支援に携わり、デジタル導入における現場の抵抗や組織課題を痛感しました。貴社は最先端の技術知見を持ちながら、クライアントの企業文化や業務プロセスに深くコミットする支援体制を整えています。入社後は、自身のエンジニアリング理解を基盤に、顧客の本質的な課題を特定し、AIやクラウド技術を活用した持続可能な業務変革を実現したいです。",
          status: "review",
          deadline: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
          track: "早期選考",
          charLimit: 500,
        },
      ],
      events: [
        {
          id: "ev_sample_gic_1",
          kind: "test",
          title: "WEB適性検査（テストセンター）締切",
          start: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
          location: "自宅またはテストセンター",
          track: "早期選考",
          notes: "言語・非言語・性格検査。非言語の推論分野を復習しておくこと。",
        },
      ],
      contacts: [],
      documents: [],
    },
  ];
}

export function createSampleTasks(): TaskItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: "tk_sample_1",
      rev: 1,
      updatedAt: now,
      isSample: true,
      title: "テックフロンティア：2次面接の逆質問を3点準備する",
      state: "doing",
      due: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      companyId: "co_sample_tech",
      notes: "開発組織の拡大方針、評価制度、技術スタックの今後の見通しについて質問を作成する。",
    },
    {
      id: "tk_sample_2",
      rev: 1,
      updatedAt: now,
      isSample: true,
      title: "グローバル・イノベーション：ES（500字）の推敲と提出",
      state: "todo",
      due: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      companyId: "co_sample_consulting",
      notes: "AIと壁打ちして論理の飛躍がないかチェックした上でマイページから提出する。",
    },
    {
      id: "tk_sample_3",
      rev: 1,
      updatedAt: now,
      isSample: true,
      title: "SPI非言語問題集（推論・確率）の演習完了",
      state: "todo",
      due: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      companyId: "co_sample_consulting",
      notes: "第3章〜第5章を復習する。",
    },
  ];
}

export function createSampleNotes(): NoteItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: "nt_sample_1",
      rev: 1,
      updatedAt: now,
      isSample: true,
      date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
      title: "テックフロンティア 1次面接振り返り",
      companyId: "co_sample_tech",
      content:
        "【面接の雰囲気】\n非常にフラット。面接官のエンジニアの方がこちらの話を熱心に聞いてくれた。\n\n【聞かれたこと】\n- ハッカソンでのチーム開発の役割\n- 技術選定（Next.jsとGo）の背景\n- 意見が衝突したときにどう合意形成したか\n\n【手応えと改善点】\n開発の技術的な苦労は具体的に伝えられたが、サービスのビジネス価値（なぜその課題を解決しようと思ったか）の言語化が少し弱かった。2次面接では事業貢献の視点を意識して話す。",
    },
  ];
}
