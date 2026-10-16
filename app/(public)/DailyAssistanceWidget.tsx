import Link from "next/link";
import { DollarSign, Sun, CloudSun, CloudRain, Wind, Flame, ShieldCheck, ExternalLink } from "lucide-react";

interface AssistanceData {
  usdRate: number;
  temp: number;
  weatherCondition: string;
  weatherCode: number;
  aqi: number;
  aqiStatus: string;
  aqiLevel: 'good' | 'moderate' | 'unhealthy-sensitive' | 'unhealthy';
  trends: string[];
}

async function getAssistanceData(): Promise<AssistanceData> {
  // Nilai fallback default yang aman jika API eksternal offline/timeout
  const fallbackData: AssistanceData = {
    usdRate: 16245,
    temp: 29,
    weatherCondition: "Cerah Berawan",
    weatherCode: 1,
    aqi: 68,
    aqiStatus: "Sedang",
    aqiLevel: "moderate",
    trends: ["Kecerdasan Buatan", "Apple iPhone", "Keamanan Siber"],
  };

  try {
    const [currencyRes, weatherRes, aqiRes, trendsRes] = await Promise.allSettled([
      fetch("https://open.er-api.com/v6/latest/USD", {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(2500),
      }).then((r) => r.json()),
      fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=-6.2088&longitude=106.8456&current=temperature_2m,weather_code&timezone=Asia%2FJakarta",
        {
          next: { revalidate: 1800 },
          signal: AbortSignal.timeout(2500),
        }
      ).then((r) => r.json()),
      fetch(
        "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-6.2088&longitude=106.8456&current=us_aqi&timezone=Asia%2FJakarta",
        {
          next: { revalidate: 1800 },
          signal: AbortSignal.timeout(2500),
        }
      ).then((r) => r.json()),
      fetch("https://trends.google.com/trending/rss?geo=ID", {
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(2500),
      }).then((r) => r.text()),
    ]);

    // 1. Kurs USD
    let usdRate = fallbackData.usdRate;
    if (currencyRes.status === "fulfilled" && currencyRes.value?.rates?.IDR) {
      usdRate = Math.round(currencyRes.value.rates.IDR);
    }

    // 2. Cuaca Jakarta
    let temp = fallbackData.temp;
    let weatherCondition = fallbackData.weatherCondition;
    let weatherCode = fallbackData.weatherCode;
    if (weatherRes.status === "fulfilled" && weatherRes.value?.current) {
      temp = Math.round(weatherRes.value.current.temperature_2m);
      weatherCode = weatherRes.value.current.weather_code ?? 1;
      if (weatherCode === 0) weatherCondition = "Cerah";
      else if ([1, 2, 3].includes(weatherCode)) weatherCondition = "Cerah Berawan";
      else if ([45, 48].includes(weatherCode)) weatherCondition = "Berkabut";
      else if ([51, 53, 55, 61, 63, 65].includes(weatherCode)) weatherCondition = "Hujan";
      else if ([80, 81, 82].includes(weatherCode)) weatherCondition = "Hujan Deras";
      else if ([95, 96, 99].includes(weatherCode)) weatherCondition = "Hujan Petir";
    }

    // 3. AQI Jakarta
    let aqi = fallbackData.aqi;
    let aqiStatus = fallbackData.aqiStatus;
    let aqiLevel = fallbackData.aqiLevel;
    if (aqiRes.status === "fulfilled" && aqiRes.value?.current?.us_aqi) {
      aqi = Math.round(aqiRes.value.current.us_aqi);
      if (aqi <= 50) {
        aqiStatus = "Baik";
        aqiLevel = "good";
      } else if (aqi <= 100) {
        aqiStatus = "Sedang";
        aqiLevel = "moderate";
      } else if (aqi <= 150) {
        aqiStatus = "Sensitif";
        aqiLevel = "unhealthy-sensitive";
      } else {
        aqiStatus = "Tidak Sehat";
        aqiLevel = "unhealthy";
      }
    }

    // 4. Google Trends ID
    let trends = fallbackData.trends;
    if (trendsRes.status === "fulfilled" && typeof trendsRes.value === "string") {
      const list: string[] = [];
      const matches = trendsRes.value.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>/g);
      for (const match of matches) {
        if (match[1]) {
          const clean = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/, "$1").trim();
          if (clean && clean.length <= 26 && !list.includes(clean)) {
            list.push(clean);
          }
        }
      }
      if (list.length >= 3) {
        trends = list.slice(0, 3);
      }
    }

    return {
      usdRate,
      temp,
      weatherCondition,
      weatherCode,
      aqi,
      aqiStatus,
      aqiLevel,
      trends,
    };
  } catch {
    return fallbackData;
  }
}

export default async function DailyAssistanceWidget() {
  const data = await getAssistanceData();

  // Warna indikator badge AQI
  const aqiBadgeClass =
    data.aqiLevel === "good"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : data.aqiLevel === "moderate"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : data.aqiLevel === "unhealthy-sensitive"
      ? "bg-orange-100 text-orange-800 border-orange-200"
      : "bg-rose-100 text-rose-800 border-rose-200";

  return (
    <div className="mt-8 pt-6 sm:mt-6 sm:pt-5 border-t border-gray-200/80 mb-8 sm:mb-0">
      {/* Header Widget */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
          </span>
          <h3 className="text-sm font-bold font-heading text-gray-900 tracking-tight flex items-center gap-1.5">
            <span>Info Harian & Tren</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-medium sm:hidden">Geser ➔</span>
          <span className="text-[10px] text-indigo-600 font-medium hidden sm:inline bg-indigo-50 px-2 py-0.5 rounded-full">
            Live Update
          </span>
        </div>
      </div>

      {/* Grid Kartu / Horizontal Scroll di Mobile (Sejajar dengan padding halaman tanpa mepet tepi) */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-2.5 overflow-x-auto pb-3 sm:pb-0 scrollbar-hide snap-x">
        
        {/* KARTU 1: Kurs USD ke IDR */}
        <div className="w-[180px] sm:w-auto shrink-0 snap-start bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 sm:p-3 flex flex-col justify-between transition-all group shadow-2xs min-h-[96px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              USD / IDR
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
              Rp {data.usdRate.toLocaleString("id-ID")}
            </div>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              Acuan Pasar Global
            </span>
          </div>
        </div>

        {/* KARTU 2: Cuaca & Suhu Hari Ini */}
        <div className="w-[180px] sm:w-auto shrink-0 snap-start bg-amber-50/40 hover:bg-amber-50/70 border border-amber-200/60 rounded-xl p-3.5 sm:p-3 flex flex-col justify-between transition-all group shadow-2xs min-h-[96px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Jakarta
            </span>
            <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              {data.weatherCode === 0 ? (
                <Sun className="w-3.5 h-3.5" />
              ) : [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(data.weatherCode) ? (
                <CloudRain className="w-3.5 h-3.5" />
              ) : (
                <CloudSun className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
              {data.temp}°C
            </div>
            <span className="text-[10px] text-amber-800/80 font-medium block mt-0.5 truncate">
              {data.weatherCondition}
            </span>
          </div>
        </div>

        {/* KARTU 3: Kualitas Udara (AQI) */}
        <div className="w-[180px] sm:w-auto shrink-0 snap-start bg-teal-50/40 hover:bg-teal-50/70 border border-teal-200/60 rounded-xl p-3.5 sm:p-3 flex flex-col justify-between transition-all group shadow-2xs min-h-[96px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Udara (AQI)
            </span>
            <div className="w-6 h-6 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <Wind className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                {data.aqi}
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${aqiBadgeClass}`}>
                {data.aqiStatus}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              Indeks PM2.5
            </span>
          </div>
        </div>

        {/* KARTU 4: Trending Topik Google Hari Ini (Lebar 2 Kolom di Desktop) */}
        <div className="w-[280px] sm:w-auto sm:col-span-2 shrink-0 snap-start bg-gradient-to-br from-indigo-50/50 to-purple-50/30 hover:bg-indigo-50/70 border border-indigo-200/60 rounded-xl p-3.5 sm:p-3 flex flex-col justify-between transition-all group shadow-2xs min-h-[96px]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-gray-800 tracking-tight">
                Tren Google Hari Ini
              </span>
            </div>
            <span className="text-[9px] font-bold text-indigo-600 bg-white/90 border border-indigo-100 px-1.5 py-0.5 rounded shadow-2xs">
              Indonesia
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {data.trends.map((trend, idx) => (
              <Link
                key={idx}
                href={`/cari?q=${encodeURIComponent(trend)}`}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 bg-white/95 hover:bg-indigo-600 hover:text-white border border-gray-200/80 hover:border-indigo-600 px-2 py-0.5 rounded-lg transition-all shadow-2xs group/tag max-w-[170px]"
                title={`Cari berita seputar: ${trend}`}
              >
                <span className="text-[10px] font-bold text-indigo-500 group-hover/tag:text-indigo-200">
                  #{idx + 1}
                </span>
                <span className="truncate">{trend}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* KARTU 5: Status Layanan Digital (Lebar 1 Kolom di Desktop) */}
        <div className="w-[190px] sm:w-auto sm:col-span-1 shrink-0 snap-start bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 sm:p-3 flex flex-col justify-between transition-all group shadow-2xs min-h-[96px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Layanan Digital
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="text-xs sm:text-sm font-bold text-emerald-700">
                100% Normal
              </span>
            </div>
            <span className="text-[9.5px] text-gray-400 block mt-0.5 truncate" title="Google, WhatsApp, Cloudflare, AWS">
              Google • WA • Cloudflare • AWS
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
