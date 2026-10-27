async function getWeather({ lat, lon }) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('No se pudo consultar el clima');
  }

  const payload = await response.json();
  return payload.current;
}

async function geocode(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '3');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'control-de-gastos-super/1.0'
    }
  });

  if (!response.ok) {
    throw new Error('No se pudo consultar geocodificación');
  }

  return response.json();
}

module.exports = { getWeather, geocode };
