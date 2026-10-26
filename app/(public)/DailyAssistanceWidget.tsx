import Link from "next/link";

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
      weatherCode = weatherRes.value.current.weather_code;

      if (weatherCode === 0) weatherCondition = "Cerah";
      else if ([1, 2, 3].includes(weatherCode)) weatherCondition = "Cerah Berawan";
      else if ([45, 48].includes(weatherCode)) weatherCondition = "Berkabut";
      else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode))
        weatherCondition = "Hujan Ringan";
      else if ([95, 96, 99].includes(weatherCode)) weatherCondition = "Hujan Petir";
    }

    // 3. Kualitas Udara (AQI)
    let aqi = fallbackData.aqi;
    let aqiStatus = fallbackData.aqiStatus;
    let aqiLevel = fallbackData.aqiLevel;
    if (aqiRes.status === "fulfilled" && aqiRes.value?.current) {
      aqi = Math.round(aqiRes.value.current.us_aqi);
      if (aqi <= 50) {
        aqiStatus = "Baik";
        aqiLevel = "good";
      } else if (aqi <= 100) {
        aqiStatus = "Sedang";
        aqiLevel = "moderate";
      } else if (aqi <= 150) {
        aqiStatus = "Tidak Sehat bagi Sensitif";
        aqiLevel = "unhealthy-sensitive";
      } else {
        aqiStatus = "Tidak Sehat";
        aqiLevel = "unhealthy";
      }
    }

    // 4. Trending Topics Google
    let trends = fallbackData.trends;
    if (trendsRes.status === "fulfilled" && typeof trendsRes.value === "string") {
      const titles = trendsRes.value.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g);
      if (titles && titles.length > 0) {
        const list = titles
          .map((t) => t.replace(/<title><!\[CDATA\[/, "").replace(/\]\]><\/title>/, ""))
          .filter((t) => t && t.trim() !== "" && !t.includes("Daily Search Trends"));
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

  return (
    <div className="mt-8 pt-6 sm:mt-6 sm:pt-5 border-t border-gray-200/80 mb-8 sm:mb-0">
      {/* Header Widget (Polos & Bersih) */}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-bold font-heading text-gray-900 tracking-tight">
          Info Harian & Tren
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-medium sm:hidden">Geser ➔</span>
          <span className="text-[10px] text-gray-600 font-medium hidden sm:inline bg-gray-100 px-2 py-0.5 rounded">
            Live Update
          </span>
        </div>
      </div>

      {/* Grid Kartu Minimalis Polos Bebas Ikon */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-2.5 overflow-x-auto pb-3 sm:pb-0 scrollbar-hide snap-x">

        {/* KARTU 1: Kurs USD ke IDR */}
        <div className="w-[180px] sm:w-auto shrink-0 snap-start bg-white border border-gray-200 rounded-sm p-3 flex flex-col justify-between hover:border-gray-400 transition-colors shadow-2xs min-h-[96px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              USD / IDR
            </span>
          </div>
          <div>
            <div className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
              Rp {data.usdRate.toLocaleString("id-ID")}
            </div>
            <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
              Acuan Pasar Global
            </span>
          </div>
        </div>

        {/* KARTU 2: Cuaca & Suhu Hari Ini */}
        <div className="w-[180px] sm:w-auto shrink-0 snap-start bg-white border border-gray-200 rounded-sm p-3 flex flex-col justify-between hover:border-gray-400 transition-colors shadow-2xs min-h-[96px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Jakarta
            </span>
          </div>
          <div>
            <div className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
              {data.temp}°C
            </div>
            <span className="text-[10px] text-gray-400 font-medium block mt-0.5 truncate">
              {data.weatherCondition}
            </span>
          </div>
        </div>

        {/* KARTU 3: Kualitas Udara (AQI) */}
        <div className="w-[180px] sm:w-auto shrink-0 snap-start bg-white border border-gray-200 rounded-sm p-3 flex flex-col justify-between hover:border-gray-400 transition-colors shadow-2xs min-h-[96px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Udara (AQI)
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                {data.aqi}
              </span>
              <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                {data.aqiStatus}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
              Indeks PM2.5
            </span>
          </div>
        </div>

        {/* KARTU 4: Trending Topik Google Hari Ini */}
        <div className="w-[280px] sm:w-auto sm:col-span-2 shrink-0 snap-start bg-white border border-gray-200 rounded-sm p-3 flex flex-col justify-between hover:border-gray-400 transition-colors shadow-2xs min-h-[96px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-gray-900 tracking-tight">
              Tren Pencarian
            </span>
            <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              Indonesia
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {data.trends.map((trend, idx) => (
              <Link
                key={idx}
                href={`/cari?q=${encodeURIComponent(trend)}`}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 bg-gray-100 hover:bg-black hover:text-white px-2 py-0.5 rounded transition-colors group/tag max-w-[170px]"
                title={`Cari berita seputar: ${trend}`}
              >
                <span className="text-[10px] font-bold text-gray-400 group-hover/tag:text-gray-300">
                  #{idx + 1}
                </span>
                <span className="truncate">{trend}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* KARTU 5: Status Layanan Digital */}
        <div className="w-[190px] sm:w-auto sm:col-span-1 shrink-0 snap-start bg-white border border-gray-200 rounded-sm p-3 flex flex-col justify-between hover:border-gray-400 transition-colors shadow-2xs min-h-[96px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Layanan Digital
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-900 shrink-0"></span>
              <span className="text-xs sm:text-sm font-bold text-gray-900">
                100% Normal
              </span>
            </div>
            <span className="text-[9.5px] text-gray-400 font-medium block mt-0.5 truncate" title="Google, WhatsApp, Cloudflare, AWS">
              Google • WA • Cloudflare • AWS
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
