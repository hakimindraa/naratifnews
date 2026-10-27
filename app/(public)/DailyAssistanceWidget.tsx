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
    <div className="w-full bg-gray-50/80 border-y border-gray-200 py-2.5 my-6 sm:my-8 px-3.5 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Sisi Kiri: Indikator Finansial & Cuaca Real-Time */}
        <div className="flex items-center space-x-4 sm:space-x-6 overflow-x-auto scrollbar-hide py-0.5">
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="font-heading font-bold text-[10px] uppercase text-gray-500 tracking-wider">
              USD/IDR
            </span>
            <span className="font-heading font-semibold text-gray-900 text-xs sm:text-sm">
              Rp {data.usdRate.toLocaleString("id-ID")}
            </span>
          </div>

          <span className="text-gray-300 font-light select-none">|</span>

          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="font-heading font-bold text-[10px] uppercase text-gray-500 tracking-wider">
              Jakarta
            </span>
            <span className="font-heading font-semibold text-gray-900 text-xs sm:text-sm">
              {data.temp}°C
            </span>
            <span className="text-gray-500 text-[11px] font-medium hidden md:inline">
              ({data.weatherCondition})
            </span>
          </div>

          <span className="text-gray-300 font-light select-none">|</span>

          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="font-heading font-bold text-[10px] uppercase text-gray-500 tracking-wider">
              Udara (AQI)
            </span>
            <span className="font-heading font-semibold text-gray-900 text-xs sm:text-sm">
              {data.aqi}
            </span>
            <span className="text-[10px] font-medium text-gray-700 bg-gray-200/80 px-1.5 py-0.5 rounded-xs">
              {data.aqiStatus}
            </span>
          </div>
        </div>

        {/* Sisi Kanan: Tren Pencarian Populer Indonesia */}
        {data.trends.length > 0 && (
          <div className="flex items-center space-x-2 shrink-0 overflow-x-auto scrollbar-hide">
            <span className="font-heading font-bold text-[10px] uppercase text-gray-500 tracking-wider shrink-0">
              Tren Populer:
            </span>
            <div className="flex items-center space-x-1.5">
              {data.trends.map((t, idx) => (
                <Link
                  key={idx}
                  href={`/cari?q=${encodeURIComponent(t)}`}
                  className="bg-white hover:bg-black hover:text-white border border-gray-200 text-gray-800 text-[11px] font-medium px-2 py-0.5 rounded-xs transition-colors whitespace-nowrap"
                  title={`Cari berita seputar: ${t}`}
                >
                  #{t}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
