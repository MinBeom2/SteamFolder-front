import React from 'react';
import { SteamLoginButton } from '@/components/auth/SteamLoginButton';
import { useThemeStore } from '@/store/useThemeStore';

const ROW1_GAMES = [
  { appId: 1245620, name: 'Elden Ring', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg' },
  { appId: 1091500, name: 'Cyberpunk 2077', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg' },
  { appId: 2358720, name: 'Black Myth: Wukong', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2358720/header.jpg' },
  { appId: 1086940, name: "Baldur's Gate 3", img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg' },
  { appId: 582010, name: 'Monster Hunter: World', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/582010/header.jpg' },
  { appId: 553850, name: 'Helldivers 2', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/553850/header.jpg' },
  { appId: 1174180, name: 'Red Dead Redemption 2', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/header.jpg' },
  { appId: 292030, name: 'The Witcher 3: Wild Hunt', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg' },
  { appId: 1888160, name: 'Armored Core VI', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1888160/header.jpg' },
  { appId: 1627720, name: 'Lies of P', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1627720/header.jpg' },
  { appId: 814380, name: 'Sekiro: Shadows Die Twice', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/814380/header.jpg' },
  { appId: 2215430, name: 'Ghost of Tsushima', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2215430/header.jpg' },
];

const ROW2_GAMES = [
  { appId: 1623730, name: 'Palworld', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1623730/header.jpg' },
  { appId: 271590, name: 'Grand Theft Auto V', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg' },
  { appId: 1868140, name: 'Dave the Diver', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1868140/header.jpg' },
  { appId: 1145350, name: 'Hades II', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1145350/header.jpg' },
  { appId: 367520, name: 'Hollow Knight', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/367520/header.jpg' },
  { appId: 730, name: 'Counter-Strike 2', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/730/header.jpg' },
  { appId: 1687950, name: 'Persona 5 Royal', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1687950/header.jpg' },
  { appId: 1462040, name: 'Final Fantasy VII Remake', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1462040/header.jpg' },
  { appId: 1593500, name: 'God of War', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1593500/header.jpg' },
  { appId: 524220, name: 'NieR:Automata', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/524220/header.jpg' },
  { appId: 1364780, name: 'Street Fighter 6', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1364780/header.jpg' },
  { appId: 1778820, name: 'Tekken 8', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1778820/header.jpg' },
];

const ROW3_GAMES = [
  { appId: 990080, name: 'Hogwarts Legacy', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/990080/header.jpg' },
  { appId: 1172470, name: 'Apex Legends', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1172470/header.jpg' },
  { appId: 374320, name: 'Dark Souls III', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/374320/header.jpg' },
  { appId: 646570, name: 'Slay the Spire', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/646570/header.jpg' },
  { appId: 2050650, name: 'Resident Evil 4', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2050650/header.jpg' },
  { appId: 413150, name: 'Stardew Valley', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/413150/header.jpg' },
  { appId: 381210, name: 'Dead by Daylight', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/381210/header.jpg' },
  { appId: 252490, name: 'Rust', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/252490/header.jpg' },
  { appId: 2138330, name: 'Cyberpunk 2077: Phantom Liberty', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2138330/header.jpg' },
  { appId: 1790600, name: 'DRAGON BALL: Sparking! ZERO', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1790600/header.jpg' },
  { appId: 427520, name: 'Factorio', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/427520/header.jpg' },
  { appId: 294100, name: 'RimWorld', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/294100/header.jpg' },
];

const ROW4_GAMES = [
  { appId: 1446780, name: 'Monster Hunter Rise', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1446780/header.jpg' },
  { appId: 1551360, name: 'Forza Horizon 5', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg' },
  { appId: 105600, name: 'Terraria', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/105600/header.jpg' },
  { appId: 1172620, name: 'Sea of Thieves', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1172620/header.jpg' },
  { appId: 782330, name: 'DOOM Eternal', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/782330/header.jpg' },
  { appId: 1426210, name: 'It Takes Two', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426210/header.jpg' },
  { appId: 289070, name: 'Civilization VI', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/289070/header.jpg' },
  { appId: 264710, name: 'Subnautica', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/264710/header.jpg' },
  { appId: 588650, name: 'Dead Cells', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/588650/header.jpg' },
  { appId: 1145360, name: 'Hades', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1145360/header.jpg' },
  { appId: 1817070, name: "Marvel's Spider-Man Remastered", img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1817070/header.jpg' },
  { appId: 1222140, name: 'Detroit: Become Human', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1222140/header.jpg' },
];

const ROW5_GAMES = [
  { appId: 570, name: 'DOTA 2', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/570/header.jpg' },
  { appId: 431960, name: 'Wallpaper Engine', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/431960/header.jpg' },
  { appId: 1966720, name: 'Lethal Company', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1966720/header.jpg' },
  { appId: 892970, name: 'Valheim', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/892970/header.jpg' },
  { appId: 359550, name: 'Rainbow Six Siege', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/359550/header.jpg' },
  { appId: 550, name: 'Left 4 Dead 2', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/550/header.jpg' },
  { appId: 218620, name: 'Payday 2', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/218620/header.jpg' },
  { appId: 548430, name: 'Deep Rock Galactic', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/548430/header.jpg' },
  { appId: 739630, name: 'Phasmophobia', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/739630/header.jpg' },
  { appId: 4000, name: "Garry's Mod", img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4000/header.jpg' },
  { appId: 227300, name: 'Euro Truck Simulator 2', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/227300/header.jpg' },
  { appId: 440, name: 'Team Fortress 2', img: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/440/header.jpg' },
];

interface MarqueeRowProps {
  games: typeof ROW1_GAMES;
  duration: number;
  isDark: boolean;
}

const MarqueeRow: React.FC<MarqueeRowProps> = ({ games, duration, isDark }) => {
  const cardClassName = isDark
    ? 'w-60 sm:w-72 h-30 sm:h-36 rounded-lg overflow-hidden shadow-lg border border-white/10 shrink-0 bg-[#121620]'
    : 'w-60 sm:w-72 h-30 sm:h-36 rounded-lg overflow-hidden shadow-md border border-slate-200/80 shrink-0 bg-white';

  return (
    <div className="flex w-max shrink-0 will-change-transform" style={{ animation: `marqueeSeamless ${duration}s linear infinite` }}>
      {["a", "b"].map((copy) => (
        <div key={copy} className="flex gap-4 sm:gap-5 shrink-0 pr-4 sm:pr-5">
          {games.map((game, idx) => (
            <div key={`${copy}-${game.appId}-${idx}`} className={cardClassName}>
              <img src={game.img} alt={game.name} className="w-full h-full object-cover select-none" loading="lazy" decoding="async" draggable={false} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const LandingHeroMarquee: React.FC = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <div className={`relative flex-1 w-full h-full flex flex-col items-center justify-center overflow-hidden transition-colors duration-200 ${isDark ? 'bg-[#07090e]' : 'bg-white'}`}>
      <style>{`
        @keyframes marqueeSeamless {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>

      <div className={`absolute -inset-[50vw] flex flex-col justify-center gap-3.5 sm:gap-5 pointer-events-none select-none overflow-hidden -rotate-[15deg] scale-125 origin-center transition-opacity duration-300 ${isDark ? 'opacity-50 blur-[3px]' : 'opacity-35 blur-[2.5px] brightness-105'}`}>
        <MarqueeRow games={ROW1_GAMES} duration={52} isDark={isDark} />
        <MarqueeRow games={ROW2_GAMES} duration={66} isDark={isDark} />
        <MarqueeRow games={ROW3_GAMES} duration={46} isDark={isDark} />
        <MarqueeRow games={ROW4_GAMES} duration={60} isDark={isDark} />
        <MarqueeRow games={ROW5_GAMES} duration={50} isDark={isDark} />
        <MarqueeRow games={ROW1_GAMES} duration={56} isDark={isDark} />
        <MarqueeRow games={ROW2_GAMES} duration={44} isDark={isDark} />
        <MarqueeRow games={ROW3_GAMES} duration={62} isDark={isDark} />
        <MarqueeRow games={ROW4_GAMES} duration={48} isDark={isDark} />
        <MarqueeRow games={ROW5_GAMES} duration={54} isDark={isDark} />
        <MarqueeRow games={ROW1_GAMES} duration={42} isDark={isDark} />
        <MarqueeRow games={ROW2_GAMES} duration={58} isDark={isDark} />
        <MarqueeRow games={ROW3_GAMES} duration={48} isDark={isDark} />
        <MarqueeRow games={ROW4_GAMES} duration={64} isDark={isDark} />
      </div>

      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-300"
        style={{
          backgroundColor: isDark
            ? 'rgba(7, 9, 14, 0.78)'
            : 'rgba(255, 255, 255, 0.78)',
        }}
      />

      <div className="relative z-10 max-w-xl mx-auto px-6 py-12 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <h1 className={`text-3xl sm:text-5xl font-bold tracking-tight leading-tight transition-colors duration-200 ${isDark ? 'text-white drop-shadow-lg' : 'text-[#171d25] drop-shadow-xs'}`}>
          스팀 라이브러리를 <br />
          <span className={`transition-colors duration-200 ${isDark ? 'text-[#66c0f4]' : 'text-[#1a5b8c]'}`}>
            나만의 쇼케이스
          </span>
          로
        </h1>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <SteamLoginButton size="lg" />
        </div>
      </div>
    </div>
  );
};

export default LandingHeroMarquee;
