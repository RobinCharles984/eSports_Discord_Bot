import 'dotenv/config';

async function test() {
  const riotId = "Zé Frango#PSDK"; // Ex: Charles#UNTY
  const [name, tag] = riotId.split('#');
  const apiKey = process.env.HENRIK_API_KEY;

  const url = `https://api.henrikdev.xyz/valorant/v3/matches/br/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  
  console.log(`Testando requisição para: ${url}`);

  const response = await fetch(url, {
    headers: { 'Authorization': apiKey || '' }
  });

  console.log(`Status HTTP: ${response.status}`);
  const data = await response.json();
  
  if (response.ok) {
    console.log(`Sucesso! Partidas encontradas: ${data.data?.length || 0}`);
    if (data.data?.[0]) {
      console.log('Exemplo de metadados da última partida:', data.data[0].metadata);
    }
  } else {
    console.log('Erro retornado pela API:', JSON.stringify(data, null, 2));
  }
}

test();