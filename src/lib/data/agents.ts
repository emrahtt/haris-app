import type { Agent, AgentActivity } from "./types";

export const AGENTS: Agent[] = [
  {
    id: 1,
    name: "Orkestra Ajanı",
    role: "Baş Avukat — Görev Planlama",
    icon: "Brain",
    layer: "orkestra",
    description:
      "30 yıllık kıdemli ortak avukat. Görev planı çıkarır, diğer ajanları çağırır, sonuçları sentezler.",
  },
  {
    id: 2,
    name: "Maddi Olay Analisti",
    role: "Kronoloji & Çelişki Tespiti",
    icon: "Eye",
    layer: "analiz",
    description:
      "Detektif gibi düşünür. Dosyadaki tüm belgelerden olayların kronolojik akışını çıkarır, çelişkileri yakalar.",
  },
  {
    id: 3,
    name: "Hukuki Nitelendirici",
    role: "Olay → Kanun Maddesi Eşleştirme",
    icon: "Scale",
    layer: "analiz",
    description:
      "Her olayı en az 3 farklı hukuki nitelendirmeyle dener; en güçlü dayanağı seçer.",
  },
  {
    id: 4,
    name: "Mevzuat Tarayıcı",
    role: "Yürürlükteki Kanun & Yönetmelik",
    icon: "FileText",
    layer: "araştırma",
    description:
      "Sadece yürürlükteki mevzuatı çağırır, mülga maddeleri otomatik işaretler. Resmi Gazete günlük güncellenir.",
  },
  {
    id: 5,
    name: "İçtihat Avcısı",
    role: "Yargıtay/Danıştay/AYM Emsal Kararlar",
    icon: "Search",
    layer: "araştırma",
    description:
      "5M+ karar arasından ilk 50 emsali tarar, en güçlü 8'ini seçer. Benzerlik skoru ile sıralar.",
  },
  {
    id: 6,
    name: "Doktrin Tarayıcı",
    role: "Akademik Şerh & Görüş",
    icon: "Library",
    layer: "araştırma",
    description: "Karşıt görüşleri de getirir; tek yanlı analiz yapmaz.",
  },
  {
    id: 7,
    name: "Usul Hukukçusu",
    role: "HMK/CMK Süre & Yetki Kontrolü",
    icon: "Clock",
    layer: "analiz",
    description: "Süreyi kaçırmaz. Yetki itirazını her zaman ilk gündeme alır.",
  },
  {
    id: 8,
    name: "Risk Analisti",
    role: "Zayıf Yön & Karşı Argüman Tespiti",
    icon: "AlertTriangle",
    layer: "analiz",
    description: "Acımasızdır. Müvekkilin avukatı değil, dış denetçi rolünde davranır.",
  },
  {
    id: 9,
    name: "Dilekçe Yazarı",
    role: "Resmi Format Üretim",
    icon: "FileText",
    layer: "üretim",
    description:
      "Türk hukuk dili. Mahkeme başlığı, taraflar, açıklamalar, hukuki sebepler, neticei talep — eksiksiz.",
  },
  {
    id: 10,
    name: "Savunma Mimarı",
    role: "Argüman Sıralaması & Strateji",
    icon: "Shield",
    layer: "üretim",
    description: "En güçlü argüman ortada, en zayıfı kısa geçilir. Etkili sıralama esastır.",
  },
  {
    id: 11,
    name: "Editör/Üslupçu",
    role: "Türkçe Dil & Tutarlılık",
    icon: "Sparkles",
    layer: "üretim",
    description: "Yüksek hukuki Türkçe. Aşırı süslemeden kaçınır; net ve etkili üslup.",
  },
  {
    id: 12,
    name: "Karşı Taraf Simülatörü",
    role: "Adversarial Red-Team",
    icon: "Flame",
    layer: "kalite",
    description:
      "HARIS'in 'gizli silahı'. Üretilen savunmayı karşı tarafın avukatı gibi parçalar. 2-3 tur döngü.",
  },
];

/**
 * Dashboard ve Ajan Paneli için canlı aktivite mock'u
 */
export const AGENT_ACTIVITIES: AgentActivity[] = [
  {
    agentId: 1,
    status: "working",
    task: "A. Yılmaz davası strateji planı oluşturuluyor",
    progress: 62,
    timeAgo: "şimdi",
  },
  {
    agentId: 2,
    status: "working",
    task: "M. Demir kıdem davası kronolojisi çıkarılıyor",
    progress: 78,
    timeAgo: "1 dk önce",
  },
  {
    agentId: 3,
    status: "working",
    task: "Beta Holding sözleşme analizi devam ediyor",
    progress: 45,
    timeAgo: "2 dk önce",
  },
  {
    agentId: 4,
    status: "working",
    task: "K. Aydın savunma argüman sıralaması",
    progress: 91,
    timeAgo: "3 dk önce",
  },
  {
    agentId: 5,
    status: "done",
    task: "A. Yılmaz davası — 47 emsal Yargıtay kararı tarandı, 8 seçildi",
    progress: 100,
    timeAgo: "2 dk önce",
  },
  {
    agentId: 6,
    status: "done",
    task: "M. Demir davası — 8 doktrin atıfı eklendi",
    progress: 100,
    timeAgo: "5 dk önce",
  },
  {
    agentId: 7,
    status: "done",
    task: "A. Yılmaz davası — HMK süreleri kontrol edildi",
    progress: 100,
    timeAgo: "8 dk önce",
  },
  {
    agentId: 8,
    status: "done",
    task: "Beta Holding — 3 zayıf yön tespit edildi",
    progress: 100,
    timeAgo: "12 dk önce",
  },
  {
    agentId: 9,
    status: "done",
    task: "M. Demir davası — Dava dilekçesi hazır (12 sayfa)",
    progress: 100,
    timeAgo: "18 dk önce",
  },
  {
    agentId: 10,
    status: "idle",
    task: "Bekliyor",
    progress: 0,
    timeAgo: "—",
  },
  {
    agentId: 11,
    status: "idle",
    task: "Bekliyor",
    progress: 0,
    timeAgo: "—",
  },
  {
    agentId: 12,
    status: "working",
    task: "K. Aydın savunmasına 12 saldırı, 9'u savuşturuldu",
    progress: 75,
    timeAgo: "5 dk önce",
  },
];
