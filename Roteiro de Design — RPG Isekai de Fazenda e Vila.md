# Roteiro de Design — RPG Isekai de Fazenda e Vila

Oct 14, 2026 · @LTravezani

## 1. Visão geral

**Título provisório:** *Raízes de Solária*. RPG 2D top-down de fazenda, construção de vila e exploração, em pixel art 16x16, feito em JavaScript (navegador/desktop) com os assets Sunnyside World.

**Premissa:** o jogador renasce em outro mundo como o "Semeador", um escolhido da deusa da colheita, e precisa transformar um vilarejo arruinado em uma rede de cidades enquanto investiga a Murcha, uma corrupção que faz goblins se rebelarem e esqueletos saírem das masmorras.

**Pilares de design**

1. **Cultivar** – a fazenda é o motor econômico e a fonte de quase todos os recursos de progressão.
2. **Construir** – o jogador é o responsável direto pela evolução da vila: decide, financia e constrói cada prédio.
3. **Explorar** – mapas ao redor liberam recursos novos; masmorras secretas guardam a história e o equipamento raro.
4. **Crescer** – personagem e vila evoluem juntos; cada avanço de um destrava algo no outro.

**Loop principal (um dia de jogo, \~14 min reais)**

1. Manhã: cuidar da fazenda (regar, colher, alimentar animais) e pegar as missões diárias no quadro da vila.
2. Tarde: explorar um mapa vizinho ou uma masmorra para coletar materiais e cumprir objetivos.
3. Fim de tarde: vender, fabricar e investir em construções na vila.
4. Noite: dormir para salvar, avançar construções e reiniciar as diárias.

**Loop de longo prazo:** colheitas → ouro e materiais → construções → novos aldeões, receitas e áreas → masmorras mais profundas → equipamento e história → nível da vila sobe → novas cidades.

**Escopo alvo do MVP:** 1 vila, 4 mapas externos, 2 masmorras, 6 culturas, 10 construções, Ato 1 da história, 30 modelos de missão diária.

**Público e referências:** fãs de Stardew Valley, Forager, Atomicrops e isekais como *Tensei shitara Slime* e *Isekai Nonbiri Nouka* (vida tranquila no campo).

## 2. História (isekai)

O protagonista morre de exaustão na Terra e renasce em Solária como o Semeador, com a missão de curar a terra e reconstruir o Vale do Brotar.

### Protagonista

**Nome padrão:** Rafael "Rafa" Moreira (editável na criação). 27 anos, técnico agrícola que largou o campo para trabalhar como analista de logística numa empresa de aplicativo. Vive de horas extras, comida de micro-ondas e a lembrança da roça do avô, que foi vendida para pagar dívidas.

**Morte e transporte:** numa madrugada de plantão, Rafa adormece sobre o teclado segurando um saquinho de sementes de girassol, a última lembrança do avô. Acorda deitado num campo seco, com as sementes brotando na mão.

**A deusa:** Maela, deusa da colheita, quase sem fiéis e enfraquecida. Ela explica que escolheu Rafa porque ele "ainda carrega uma semente plantada no coração". Concede a habilidade única **Toque Verdejante** (acelera o crescimento e purifica solo murcho) e o **Grimório do Semeador** (o menu do jogo: status, missões, receitas).

**Motivação:** reconstruir no novo mundo a vida no campo que perdeu na Terra. Conflito interno recorrente: voltar a se matar de trabalhar ou aprender a descansar (o sistema de energia e o "dia de descanso" reforçam isso na jogabilidade).

### O mundo: Solária

- **Vale do Brotar** – vila inicial, quase abandonada; 3 moradores restantes.
- **A Murcha** – corrupção que seca a terra e enlouquece criaturas. Nasce de um selo rompido sob as masmorras antigas.
- **Goblins** – antes eram fazendeiros aliados dos humanos; a Murcha os tornou rebeldes. Goblins curados podem virar aldeões.
- **Esqueletos** – soldados de um antigo reino que guardam as masmorras.
- **Antagonista: Vaelor, o Rei Sem Colheita** – ex-semeador de outro mundo, isekaiado séculos atrás. Ficou amargo após ver sua vila morrer e passou a ver a terra como algo a dominar, não cuidar. É o espelho do que Rafa pode virar.

### Personagens de apoio

| Personagem | Papel | Função no jogo |
| --- | --- | --- |
| Vovó Tereza | Anciã da vila | Tutorial, quadro de missões, conselheira |
| Bruno | Ferreiro rabugento | Ferramentas, armas, upgrades |
| Lina | Pescadora e exploradora | Mapas, pesca, rotas para novas áreas |
| Grik | Goblin curado | Ponte com os goblins, construções goblins |
| Irmã Clara | Sacerdotisa de Maela | Templo, bênçãos, lore da deusa |
| Dario | Mercador viajante | Loja itinerante, itens raros, fundação de cidades |

### Estrutura em atos

1. **Ato 1 – A Semente (níveis de vila 1-3):** chegada, recuperar a fazenda, reconstruir o vale, primeiro contato com goblins, primeira masmorra (Cripta do Moinho). Final: Rafa cura Grik e descobre que a Murcha é provocada por alguém.
2. **Ato 2 – As Raízes (vila 4-6):** exploração da floresta, montanhas e lago; fundação da primeira cidade-satélite; aliança com a tribo goblin; descoberta de que existiram outros semeadores.
3. **Ato 3 – A Colheita (vila 7-10):** rede de cidades, masmorras profundas, confronto com Vaelor no Coração Murcho.

**Final:** Rafa pode derrotar Vaelor ou purificá-lo (exige afinidade alta com aldeões e todas as masmorras secretas concluídas). No final verdadeiro, Maela oferece o retorno à Terra; Rafa escolhe ficar. Pós-jogo: vila nível máximo, masmorras infinitas e eventos sazonais.

## 3. Desenvolvimento do personagem

O personagem evolui por nível geral (combate e vida) e por seis profissões independentes, cada uma subindo com o uso.

### Atributos base

| Atributo | Efeito | Inicial | Ganho por nível |
| --- | --- | --- | --- |
| Vida (HP) | Dano que aguenta | 50 | +8 |
| Energia | Gasta em ações de fazenda, coleta e combate; recupera dormindo e comendo | 100 | +4 |
| Força | Dano físico, velocidade de corte e mineração | 5 | +1 |
| Agilidade | Velocidade, chance de esquiva (rolar), crítico | 5 | +1 |
| Vitalidade | Defesa e regeneração | 5 | +1 |
| Afinidade Verde | Poder do Toque Verdejante e qualidade das colheitas | 5 | +1 |

A cada nível o jogador ganha 3 pontos livres para distribuir. Nível máximo: 50.

**XP para o próximo nível:** `xp = 100 × nível^1.5` (nível 10 ≈ 3.162 XP).

### Profissões (níveis 1-20)

| Profissão | Sobe com | Desbloqueios-chave |
| --- | --- | --- |
| Agricultura | Plantar, regar, colher | Regador em área, sementes raras, irrigadores |
| Pecuária | Cuidar de animais | Celeiro maior, produtos de qualidade |
| Coleta | Cortar árvores, colher ervas | Machado duplo, mapas de recursos |
| Mineração | Quebrar rochas | Picareta de ferro e mithril, gemas |
| Pesca | Pescar | Varas melhores, peixes lendários |
| Construção | Construir e reparar | Construção mais rápida, plantas de prédios únicos |

### Árvores de habilidade

Pontos de habilidade vêm de nível geral (1 a cada 2 níveis) e de baús de masmorras secretas.

- **Guardião** – espada, escudo, contra-ataque, provocar inimigos.
- **Andarilho** – esquiva aprimorada, corrida longa, detectar passagens secretas.
- **Semeador** – Toque Verdejante em área, chuva abençoada, purificar Murcha, invocar plantas aliadas.

### Equipamentos

- **Ferramentas:** enxada, regador, machado, picareta, vara de pesca, martelo. 5 tiers: madeira → cobre → ferro → ouro → mithril. Cada tier aumenta área e reduz gasto de energia.
- **Armas:** espada, lança, arco, cajado (Afinidade Verde).
- **Armadura:** cabeça, corpo, acessório (2 slots).
- **Aparência:** 7 penteados animados do pack e troca de paleta para cabelo, pele e roupas.

## 4. Vila inicial e base

O Vale do Brotar começa em ruínas, com 3 moradores, e só evolui quando o jogador financia e constrói cada melhoria.

### A Base do Semeador

A base é a casa do jogador e o centro de comando da vila. Fica no centro do mapa, ao lado da praça e do quadro de missões.

| Nível da base | Custo | O que libera |
| --- | --- | --- |
| 1 – Barraco | Inicial | Cama (salvar), baú 20 slots, bancada básica |
| 2 – Casa | 50 madeira, 20 pedra, 500 ouro | Cozinha, baú 40 slots, sala de mapas |
| 3 – Sobrado | 150 madeira, 80 pedra, 20 ferro, 3.000 ouro | Escritório (gestão da vila), mesa de alquimia |
| 4 – Mansão | 300 madeira tratada, 150 tijolo, 10.000 ouro | Sala do conselho (políticas da vila), teleporte |
| 5 – Fortaleza Verde | Materiais de masmorra + 50.000 ouro | Muralha, torres de defesa, Altar de Maela |

### Construções da vila

Cada prédio é construído pelo jogador (animação "Building" do pack) e tem 3 níveis.

| Prédio | Função | Requisito |
| --- | --- | --- |
| Quadro de Missões | Missões diárias e pedidos | Inicial |
| Ferraria | Ferramentas, armas, upgrades | Vila nv. 1 |
| Armazém | Estoque compartilhado da vila | Vila nv. 1 |
| Casas de moradores | +2 aldeões cada | Vila nv. 1 |
| Mercado | Compra e venda, preços dinâmicos | Vila nv. 2 |
| Serraria | Madeira → tábua tratada | Vila nv. 2 |
| Celeiro e galinheiro | Animais | Vila nv. 2 |
| Doca de pesca | Pesca avançada, barco | Vila nv. 3 |
| Templo de Maela | Bênçãos diárias, purificação | Vila nv. 3 |
| Taverna | Recrutar aldeões, rumores de masmorras | Vila nv. 4 |
| Guilda de Aventureiros | Missões de combate, grupos de NPCs | Vila nv. 5 |
| Acampamento Goblin | Aldeões goblins, construções rápidas | Vila nv. 5 + Ato 2 |
| Academia | Pesquisa de tecnologias | Vila nv. 6 |
| Estação de Carroças | Rotas comerciais entre cidades | Vila nv. 7 |

### Nível da vila (1-10)

A vila sobe de nível quando atinge **Prosperidade** suficiente. Prosperidade = soma de pontos de prédios + aldeões + decoração + reputação.

| Nível | Nome | Prosperidade | Recompensa |
| --- | --- | --- | --- |
| 1 | Ruínas | 0 | Tutorial |
| 2 | Povoado | 100 | Mercado, mapa da Floresta |
| 3 | Aldeia | 300 | Doca, Templo, Lago |
| 4 | Vila | 700 | Taverna, Montanhas |
| 5 | Vila Próspera | 1.500 | Guilda, primeira cidade-satélite |
| 6-10 | Cidade → Capital | 3.000 a 30.000 | Novas cidades, masmorras profundas, final |

### Aldeões

- Cada aldeão tem profissão (fazendeiro, lenhador, minerador, artesão, guarda), felicidade (0-100) e afinidade com o jogador (0-10 corações).
- Aldeões atribuídos a prédios produzem recursos passivos por dia.
- Felicidade depende de casa, comida, decoração e segurança; abaixo de 30, o aldeão pode ir embora.
- Afinidade sobe com presentes, conversas e missões pessoais; libera receitas e cenas de história.

### Recursos da vila

Madeira, pedra, fibra, ferro, tábua tratada, tijolo, comida, ouro e Essência Verde (recurso raro de masmorras, usado em prédios de nível 3).

## 5. Fazenda

A fazenda começa com 6x6 tiles de solo murcho e cresce até 40x30, sendo a principal fonte de ouro e de ingredientes.

### Ciclo de plantio

1. **Limpar** – remover pedras, tocos e mato (picareta, machado, foice).
2. **Arar** – enxada transforma grama em solo arado.
3. **Semear** – a semente ocupa 1 tile.
4. **Regar** – 1x por dia; solo seco não avança de estágio.
5. **Crescer** – 5 estágios visuais (os 5 sprites do pack por cultura).
6. **Colher** – gera o item de colheita (sprite de harvest do pack) com qualidade normal, prata ou ouro.

**Solo murcho:** tiles corrompidos não aceitam plantio até serem purificados com o Toque Verdejante (custa energia). Purificar a fazenda inteira é a primeira grande meta do Ato 1.

### Culturas

O pack traz 11 culturas com 5 estágios cada; girassol e cenoura aparecem na interface de exemplo. Os nomes abaixo são a proposta de distribuição e devem ser ajustados aos sprites reais do pack.

| Tier | Cultura | Dias | Estação | Venda (ouro) |
| --- | --- | --- | --- | --- |
| 1 | Cenoura | 3 | Primavera | 35 |
| 1 | Couve | 4 | Primavera, Outono | 45 |
| 1 | Batata | 5 | Primavera | 60 |
| 2 | Trigo | 4 | Verão, Outono | 40 (rebrota) |
| 2 | Tomate | 7 | Verão | 25 por colheita (rebrota) |
| 2 | Milho | 8 | Verão | 90 |
| 2 | Girassol | 6 | Verão | 80 + sementes |
| 3 | Abóbora | 10 | Outono | 220 |
| 3 | Beterraba | 6 | Outono | 110 |
| 3 | Rabanete | 5 | Inverno (estufa) | 95 |
| 4 | Flor da Aurora (lendária) | 12 | Qualquer, só em solo purificado | 600 |

### Estações e clima

- 4 estações de 28 dias. Culturas fora de estação murcham no primeiro dia da estação seguinte.
- Clima diário: sol, nublado, chuva (rega automática), tempestade (pode danificar plantas sem espantalho), Neblina Murcha (evento: inimigos atacam a fazenda à noite).

### Animais

| Animal | Prédio | Produto | Observação |
| --- | --- | --- | --- |
| Galinha | Galinheiro | Ovos | Inicial |
| Vaca | Celeiro | Leite | Celeiro nv. 1 |
| Ovelha | Celeiro | Lã | Celeiro nv. 2 |
| Porco | Celeiro | Trufas | Celeiro nv. 3 |

Animais precisam de comida diária e carinho. Afinidade alta aumenta a qualidade do produto.

### Automação e processamento

- **Irrigadores** (cobre 3x3, ferro 5x5, mithril 7x7).
- **Espantalhos** protegem de pássaros e tempestades.
- **Máquinas:** moinho (trigo → farinha), barril (frutas → suco), queijaria, tear. Produtos processados valem 2-3x mais.
- **Ajudantes:** aldeões fazendeiros regam e colhem uma área atribuída.

## 6. Criação de cidades

A partir da vila nível 5, o jogador funda até 4 cidades-satélite em pontos marcados dos mapas externos, cada uma com uma especialização.

### Como fundar uma cidade

1. Limpar a área (derrotar o acampamento inimigo ou purificar a Murcha local).
2. Construir o **Marco de Fundação** (madeira tratada, pedra, 5.000 ouro).
3. Escolher a especialização (definitiva).
4. Enviar 3 aldeões da vila principal como fundadores.
5. Nomear a cidade.

### Especializações

| Cidade | Local sugerido | Produção | Prédio exclusivo |
| --- | --- | --- | --- |
| Porto | Lago / costa | Peixes, sal, comércio por barco | Estaleiro |
| Mineira | Montanhas | Minério, gemas, tijolo | Fundição |
| Madeireira | Floresta | Madeira nobre, resinas, ervas | Marcenaria |
| Goblin | Pântano (após aliança) | Construção barata, poções | Caldeirão Tribal |
| Fortificada | Perto de masmorras | Guardas, defesa contra invasões | Quartel |

### Regras de gestão

- Cada cidade tem nível próprio (1-5), população, felicidade e estoque.
- O jogador constrói prédios em cada cidade pessoalmente ou contrata construtores (mais caro, mais lento).
- **Rotas comerciais:** carroças levam recursos entre cidades uma vez por dia; rotas podem ser atacadas por goblins rebeldes (gera missões de escolta).
- **Invasões:** a cada 7 dias há chance de ataque; defesa depende de muralhas, torres e guardas.
- **Bônus de rede:** cada cidade nível 3+ dá um bônus global (ex.: Porto = +10% preço de venda; Mineira = -15% custo de upgrade de ferramentas).
- **Teleporte:** Altar de Maela em cada cidade permite viagem rápida.

## 7. Exploração de mapas ao redor

Seis regiões cercam o Vale do Brotar e são liberadas pelo nível da vila; cada uma tem recursos, inimigos e uma masmorra secreta própria.

| Região | Libera em | Recursos | Inimigos | Segredo |
| --- | --- | --- | --- | --- |
| Campos do Vale | Início | Fibra, pedra, ervas | Goblins batedores | Cripta do Moinho |
| Floresta Sussurrante | Vila nv. 2 | Madeira nobre, cogumelos, mel | Goblins arqueiros | Raízes Profundas |
| Lago Espelhado | Vila nv. 3 | Peixes, conchas, argila | Goblins piratas (barco) | Gruta Submersa |
| Montanhas Cinzentas | Vila nv. 4 | Ferro, ouro, gemas | Esqueletos mineiros | Forja Esquecida |
| Pântano Murcho | Vila nv. 5 + Ato 2 | Resinas, ervas raras | Goblins corrompidos | Aldeia Goblin Perdida |
| Terras Cinzas | Vila nv. 7 | Essência Verde, mithril | Esqueletos de elite | Coração Murcho (final) |

### Mecânicas de exploração

- **Névoa de guerra:** o mapa só é revelado ao andar; o mapa da base registra tudo.
- **Pontos de interesse:** ruínas, baús, NPCs perdidos, santuários de Maela (salvar e curar), acampamentos inimigos.
- **Coleta com ferramentas:** árvores (Cutting), rochas (Mining), pesca (Fishing), carregar objetos (Carry) – animações do pack.
- **Travessia:** pular buracos (Jump), nadar em rios (Swim), rolar sob obstáculos (Roll). Algumas áreas só abrem com upgrade (ponte, barco, picareta de ferro).
- **Respawn:** recursos voltam a cada 3 dias; acampamentos inimigos voltam a cada 7.
- **Transição de mapas:** cada região é um mapa separado de 64x64 a 96x96 tiles, ligado por bordas e por teleportes de santuário.

### Pesca

Minijogo de tempo: segurar para lançar, apertar no momento certo quando o peixe morde, manter a barra de tensão no meio. 20 espécies no total, variando por região e horário; 4 peixes lendários (um por estação).

## 8. Masmorras secretas

Cada região esconde uma masmorra que só aparece após resolver uma pista; elas guardam a história da Murcha, os chefes e o equipamento raro.

### Como encontrar

- **Rumores** na taverna ou de aldeões com afinidade alta.
- **Pistas no ambiente:** rachaduras em paredes, círculos de cogumelos, estátuas viradas, plantas murchas formando uma seta.
- **Habilidade Andarilho "Faro":** destaca passagens secretas num raio de 5 tiles.
- **Quebra-cabeças de acesso:** acender braseiros na ordem, plantar uma semente especial num pedestal, pescar uma chave no lago, empurrar blocos.

### Estrutura

- 3 a 6 andares gerados por salas pré-montadas (handcrafted) combinadas aleatoriamente, com o último andar fixo (chefe).
- Tipos de sala: combate, armadilha, puzzle, tesouro, descanso (santuário), sala secreta dentro da masmorra.
- **Luz:** masmorras são escuras; tocha consome durabilidade e o Toque Verdejante faz musgo brilhante.
- **Retorno:** sair no meio mantém o progresso do andar atual; morrer devolve à base e perde 10% do ouro carregado.

### Masmorras e chefes

| Masmorra | Andares | Chefe | Recompensa principal |
| --- | --- | --- | --- |
| Cripta do Moinho | 3 | Capitão Ossudo (esqueleto) | Espada de cobre, plantas da Ferraria nv. 2 |
| Raízes Profundas | 4 | Matriarca Raiz-Podre | Semente da Flor da Aurora |
| Gruta Submersa | 4 | Grik Corrompido (irmão de Grik) | Barco, vara de ouro |
| Forja Esquecida | 5 | Ferreiro Morto-Vivo | Plantas de ferramentas de mithril |
| Aldeia Goblin Perdida | 5 | Xamã da Murcha | Aliança goblin, Acampamento Goblin |
| Coração Murcho | 6 | Vaelor, o Rei Sem Colheita | Final do jogo |
| Abismo de Maela (pós-jogo) | Infinito | Chefes rotativos | Ranking, cosméticos |

### Inimigos

- **Goblins** (animações do pack): batedor, guerreiro, arqueiro, xamã, pirata. Derrotados com Toque Verdejante podem ser curados em vez de mortos.
- **Esqueletos** (Idle, Walk, Attack, Hurt, Death, Jump): soldado, mineiro, elite, arqueiro.
- **Variantes Murchas:** recolorir por paleta (tons roxos) com +50% de vida.

### Combate

Ação em tempo real: ataque básico, ataque carregado, rolar (invulnerável por 0,3 s), habilidade ativa (2 slots) e item rápido (comida/poção). Inimigos mostram aviso visual antes de atacar.

## 9. Missões

Há quatro camadas de missões: principais (história), de vila (construção), pessoais (aldeões) e diárias (renovam todo dia às 6h do jogo).

### Missões principais – Ato 1

| # | Missão | Objetivo | Recompensa |
| --- | --- | --- | --- |
| 1 | Uma semente na mão | Falar com Vovó Tereza, plantar o girassol | Enxada, regador |
| 2 | Terra cansada | Purificar e arar 12 tiles, colher a primeira safra | 200 ouro, Toque Verdejante nv. 2 |
| 3 | Teto sobre a cabeça | Construir a Base nv. 2 | Cozinha, receitas básicas |
| 4 | Fogo na forja | Reconstruir a Ferraria, levar 10 cobre ao Bruno | Machado de cobre |
| 5 | Olhos verdes na mata | Investigar o roubo de sementes; seguir pegadas goblins | Mapa da Floresta |
| 6 | O que o moinho esconde | Encontrar e concluir a Cripta do Moinho | Espada de cobre |
| 7 | Um goblin diferente | Curar Grik com o Toque Verdejante | Grik vira aldeão |
| 8 | Alguém plantou a Murcha | Ler o diário no altar da cripta; vila nv. 3 | Fim do Ato 1 |

### Missões de vila

Geradas pelo nível da vila: "Construa 2 casas", "Alcance 10 moradores", "Mantenha a felicidade média acima de 70 por 7 dias", "Abra uma rota comercial".

### Missões pessoais

Cada aldeão tem uma cadeia de 3 a 5 missões ligadas aos corações de afinidade. Ex.: Lina quer encontrar o barco do pai, perdido na Gruta Submersa.

### Missões diárias

O Quadro de Missões oferece **3 diárias por dia** (5 a partir da vila nv. 5), sorteadas de modelos por tipo, ajustadas ao progresso. Concluir as 3 dá um **bônus diário** (baú com sementes raras ou Essência Verde). Sequência de 7 dias seguidos dá um baú semanal.

| Tipo | Exemplos de objetivo |
| --- | --- |
| Colheita | Colha 15 cenouras · Entregue 5 colheitas de qualidade ouro |
| Cultivo | Regue 30 tiles · Plante 3 culturas diferentes |
| Coleta | Corte 20 árvores · Junte 10 cogumelos na Floresta |
| Mineração | Quebre 25 rochas · Encontre 1 gema |
| Pesca | Pesque 5 peixes no Lago · Pegue 1 peixe raro à noite |
| Caça | Derrote 8 goblins · Derrote 5 esqueletos sem ser atingido |
| Masmorra | Limpe 1 andar de qualquer masmorra · Abra 2 baús |
| Entrega | Leve 3 tábuas para Bruno · Entregue comida na taverna |
| Fabricação | Fabrique 5 farinhas · Cozinhe 2 pratos |
| Construção | Repare 3 cercas · Melhore 1 prédio |
| Social | Converse com 5 aldeões · Dê um presente preferido |
| Pecuária | Alimente todos os animais · Colete 6 ovos |
| Exploração | Visite 1 ponto de interesse novo · Ative 1 santuário |
| Purificação | Purifique 10 tiles de Murcha num mapa externo |
| Escolta | Proteja a carroça de comércio até a cidade Porto |
| Desafio de tempo | Colha 20 culturas antes do meio-dia |
| Defesa | Sobreviva à Neblina Murcha sem perder plantas |

**Regras do sorteio:** nunca dois do mesmo tipo no mesmo dia; ao menos 1 diária de fazenda; quantidades escalam com o nível do jogador; o jogador pode trocar 1 diária por dia (reroll).

**Recompensas diárias:** ouro, XP, reputação da vila, pontos de Prosperidade e itens do tipo da tarefa (ex.: pesca → isca rara).

## 10. Economia, tempo e progressão

O dia de jogo dura 14 minutos reais (6h às 2h), e a economia gira em torno de vender colheitas para financiar construções.

### Relógio

- 1 minuto de jogo = 0,7 s real. Às 2h o personagem desmaia (perde 10% do ouro carregado e acorda com metade da energia).
- Lojas abrem 9h–18h; taverna 16h–1h; inimigos mais fortes surgem à noite nos mapas externos.
- Construções avançam durante a noite (1 a 3 noites conforme o prédio).

### Fontes e drenos de ouro

| Fontes | Drenos |
| --- | --- |
| Venda de colheitas e produtos processados | Construções e upgrades de prédios |
| Recompensas de missões | Upgrade de ferramentas e armas |
| Rotas comerciais entre cidades | Sementes, ração e salários de construtores |
| Tesouros de masmorras | Decoração e cosméticos |

**Preços dinâmicos:** vender muito do mesmo item no mesmo dia reduz o preço em até 40%; ele volta ao normal em 3 dias. Isso incentiva diversificar culturas.

### Curva de progressão alvo

| Marco | Dia de jogo | Nível do personagem | Nível da vila |
| --- | --- | --- | --- |
| Fim do tutorial | 3 | 3 | 1 |
| Fim do Ato 1 | 28 | 12 | 3 |
| Primeira cidade | 60 | 20 | 5 |
| Fim do Ato 2 | 112 | 30 | 6 |
| Final | 200 | 40 | 9-10 |

### Salvamento

Salvar ao dormir e nos santuários. Formato JSON em `localStorage` (web) ou arquivo (desktop), com 3 slots.

## 11. Uso dos assets Sunnyside World

O pack cobre quase todo o núcleo do jogo (tiles 16x16, humanos, goblins, esqueletos, 11 culturas, UI); as lacunas principais são animais, chefes únicos e efeitos de magia. Fonte: [Sunnyside World no itch.io](https://danieldiggle.itch.io/sunnyside), versão 2.1.

| Asset do pack | Uso no jogo |
| --- | --- |
| Tileset 16x16 com autotiles (terra, penhascos, caminhos, água, folhagem, cercas, muros, prédios, interiores) | Todos os mapas, vila, interiores da base e das casas |
| Ações do humano: Idle, Walk, Run, Roll, Jump, Hurt, Death, Carry, Attack, Swim | Movimento, combate, travessia |
| Ações de trabalho: Cutting Trees, Mining, Building, Fishing, Activity | Coleta, construção da vila, pesca, rega/plantio |
| 7 penteados animados + troca de paleta | Criação do personagem e variação de aldeões |
| Goblins (mesmas ações) | Inimigos, aldeões goblins, Grik |
| Esqueleto: Idle, Walk, Attack, Hurt, Death, Jump | Inimigos de masmorra, Capitão Ossudo (recolorido e ampliado) |
| 11 culturas x 5 estágios + colheita | Sistema de fazenda completo |
| UI, ícones e emotes | HUD, inventário, balões de diálogo, humor dos aldeões |
| Arquivos Aseprite | Criar variantes (Murcha, chefes) |

### Restrições técnicas do pack

- Os sprites de personagem são para movimento **esquerda/direita** (espelhar o sprite para virar), como em Forager. Movimento vertical usa a animação lateral. Existe um pacote beta com 4, 6 e 8 direções, que pode ser adotado depois.
- Escala recomendada: zoom inteiro (3x ou 4x) com `imageSmoothingEnabled = false` para pixel art nítida.

### Lacunas a produzir ou buscar

- Animais de fazenda (confirmar no pack; se ausentes, criar no estilo).
- Chefes únicos, efeitos de magia (Toque Verdejante, Murcha), ícones de itens de masmorra.
- Retratos para diálogo, música e efeitos sonoros (o pack é só visual).

### Licença (V1)

Uso livre em projetos gratuitos e comerciais, com modificação permitida; crédito opcional. Proibido revender ou reempacotar os assets, inclusive como NFT, e proibido usá-los para treinar IA. Recomenda-se creditar o autor (danieldiggle) nos créditos do jogo.

## 12. Arquitetura técnica (JavaScript)

Recomendação: **Phaser 3** com mapas montados no **Tiled** (exportados em JSON), dados do jogo em arquivos JSON e lógica em módulos ES. Alternativa mais leve: Canvas puro com um loop próprio.

### Estrutura de pastas

```
/src
  main.js              // config do Phaser, lista de cenas
  /scenes              // Boot, Preload, Title, Village, Farm, Region, Dungeon, UI
  /systems             // TimeSystem, FarmSystem, QuestSystem, VillageSystem,
                       // CitySystem, CombatSystem, InventorySystem, SaveSystem
  /entities            // Player, Villager, Enemy, Crop, Animal, Building
  /data                // crops.json, buildings.json, quests.json, dailies.json,
                       // enemies.json, items.json, dialogues.json
/assets/sunnyside      // tiles, characters, ui (sem alterar nomes do pack)
/maps                  // vale.json, floresta.json, cripta_moinho.json ...
```

### Exemplo de dados: cultura

```json
{
  "id": "carrot",
  "name": "Cenoura",
  "days": 3,
  "seasons": ["spring"],
  "stages": 5,
  "sprite": "crops/carrot",
  "sellPrice": 35,
  "regrows": false,
  "xp": { "farming": 8 }
}
```

### Exemplo de dados: modelo de missão diária

```json
{
  "id": "daily_harvest_any",
  "type": "harvest",
  "title": "Safra do dia",
  "objective": { "event": "crop:harvested", "filter": { "cropId": "$randomUnlockedCrop" }, "count": "10 + playerLevel" },
  "requires": { "villageLevel": 1 },
  "rewards": { "gold": "50 * villageLevel", "xp": 40, "prosperity": 5 },
  "weight": 3
}
```

### Sistema de missões orientado a eventos

```js
// QuestSystem.js
export class QuestSystem {
  constructor(events, templates, rng) {
    this.active = [];
    this.templates = templates;
    this.rng = rng;
    events.on('*', (name, payload) => this.onEvent(name, payload));
    events.on('day:start', state => this.rollDailies(state)); // pool precisa ter ao menos dailySlots tipos distintos
  }

  rollDailies(state) {
    const pool = this.templates.filter(t => meets(t.requires, state));
    const picked = [];
    while (picked.length < state.dailySlots) {
      const t = weightedPick(pool, this.rng);
      if (picked.some(p => p.type === t.type)) continue; // sem tipos repetidos
      picked.push(instantiate(t, state));
    }
    this.active = this.active.filter(q => q.kind !== 'daily').concat(picked);
  }

  onEvent(name, payload) {
    for (const q of this.active) {
      if (q.objective.event === name && matches(q.objective.filter, payload)) {
        q.progress = Math.min(q.progress + (payload.amount ?? 1), q.objective.count);
        if (q.progress === q.objective.count) this.complete(q);
      }
    }
  }
}
```

Toda ação relevante emite um evento (`crop:harvested`, `enemy:killed`, `building:upgraded`, `fish:caught`), e missões, conquistas e tutorial apenas escutam esses eventos. Assim, novos tipos de missão diária são só novos arquivos JSON.

### Estado salvo (resumo)

```js
{
  version: 1,
  time: { day: 12, season: 'spring', year: 1, minutes: 360 },
  player: { level, xp, attrs, professions, skills, equipment, inventory, gold },
  farm: { tiles: [{ x, y, soil, cropId, stage, watered, quality }] },
  village: { level, prosperity, buildings: [{ id, level, x, y, building }], villagers: [] },
  cities: [],
  quests: { main, personal, active, dailyStreak },
  world: { revealed: {}, dungeonsFound: [], secretsOpened: [] }
}
```

### Desempenho

- Desenhar só os tiles visíveis (câmera do Phaser já faz culling).
- Atualizar culturas apenas na troca de dia, não a cada frame.
- Spritesheets agrupadas em atlas para reduzir chamadas de desenho.

## 13. Roadmap de desenvolvimento

O MVP (fases 1 a 3) entrega o Ato 1 jogável em cerca de 16 semanas; cidades e o final vêm depois, sobre a mesma base de sistemas.

&#91;embedded content: roadmap · 5 fases, 1 marco\]

Cada fase termina com uma build jogável; o marco da demo é o ponto para testar com jogadores e ajustar o balanço antes de produzir conteúdo dos Atos 2 e 3.
