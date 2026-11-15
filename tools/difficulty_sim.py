"""ElfStory P1 difficulty simulation — parses tuning constants from the actual
game source (world.ts / App.tsx) so it can never drift from the code again.
Player model = audit sim (Vanguard, Might focus, Rare gear at depth, full clears,
one enemy at a time, crit expectation). Companion = lynx, new P1 formulas."""
import math, re

W = open('src/game/world.ts').read()
A = open('src/App.tsx').read()

def case_block(arch):
    m = re.search(r"case '%s':(.*?)(?=\n    case |\n  \}\n\})" % arch, W, re.S)
    return m.group(1)

BASE = {}
for arch in ['plague_rat','goblin_skirmisher','crypt_skeleton','bone_acolyte','ash_cultist',
             'shadow_stalker','iron_golem','cinder_wisp','dread_wraith','blight_weaver','obsidian_warden',
             'grave_husk','spore_hulk','rime_revenant']:
    b = case_block(arch)
    hp = int(re.search(r'hp: Math\.round\((\d+) \* scale\)', b).group(1))
    atk = int(re.search(r'atk: Math\.round\((\d+) \* scale\)', b).group(1))
    xp = int(re.search(r'xpReward: Math\.round\((\d+) \* scale\)', b).group(1))
    dm = re.search(r'def: (\d+) \+ Math\.floor\(depth / 2\)|def: (\d+) \+ depth|def: (\d+),', b)
    if 'Math.floor(depth / 2)' in b: dk, dv = 'half', int(re.search(r'def: (\d+) \+ Math\.floor', b).group(1))
    elif re.search(r'def: \d+ \+ depth', b): dk, dv = 'depth', int(re.search(r'def: (\d+) \+ depth', b).group(1))
    else: dk, dv = 'flat', int(re.search(r'def: (\d+),', b).group(1))
    BASE[arch] = (hp, atk, (dk, dv), xp)

def boss_stats(arch):
    b = case_block(arch)
    return (int(re.search(r'hp: (\d+),', b).group(1)), int(re.search(r'atk: (\d+),', b).group(1)),
            int(re.search(r'def: (\d+),', b).group(1)), int(re.search(r'xpReward: (\d+),', b).group(1)))

BOSSES = {'Vaelen F2': boss_stats('boss_bone_cantor'), 'Serath F4': boss_stats('boss_ashen_inquisitor'),
          'Malakor F5': boss_stats('boss_malakor')}
XP_GROWTH = float(re.search(r'xpToNext \* (\d+\.\d+)\)', A).group(1))
TUNE = {k: (float(a), float(b)) for k, a, b in
        re.findall(r"(boss_\w+): \{ hp: ([\d.]+), atk: ([\d.]+) \}", W)}
RAND = (2.3, 1.35, 4)
POOLS = {1:['plague_rat','goblin_skirmisher','crypt_skeleton'],
 2:['goblin_skirmisher','crypt_skeleton','bone_acolyte','blight_weaver'],
 3:['crypt_skeleton','bone_acolyte','ash_cultist','shadow_stalker','blight_weaver','dread_wraith'],
 4:['ash_cultist','shadow_stalker','iron_golem','cinder_wisp','dread_wraith','obsidian_warden'],
 5:['ash_cultist','shadow_stalker','iron_golem','dread_wraith','obsidian_warden']}
ABYSS_POOL=['ash_cultist','shadow_stalker','iron_golem','cinder_wisp','bone_acolyte','dread_wraith','blight_weaver','obsidian_warden','grave_husk','spore_hulk','rime_revenant']

def scale(d): return 1+(d-1)*0.28 + ((d-5)*0.16 if d>5 else 0)
def edef(arch,d):
    k,v = BASE[arch][2]; return v if k=='flat' else (v+d if k=='depth' else v+d//2)
def estats(arch,d):
    s=scale(d); hp,atk,_,xp = BASE[arch]
    return round(hp*s), round(atk*s), edef(arch,d), round(xp*s)
def power_rare(d): return round((1.8+d*1.1)*1.75)
def xp_to_next(level):
    x=65
    for _ in range(level-1): x=round(x*XP_GROWTH)
    return x
def player_at(level, depth):
    might = 3 + 2*(level-1); agi, res = 1, 2; pw = power_rare(depth)
    gear_def = round(1.3*pw); gear_hp = round(1.65*pw)
    maxhp = 34+(level-1)*6 + might*5 + res*6 + gear_hp
    atk = 6 + might*3 + agi + pw
    dfn = 1 + res*2 + 1 + gear_def
    crit = min(75, round(6+agi*2.5)); dodge = min(55, round(3+agi*2))
    return dict(level=level, maxhp=maxhp, atk=atk, def_=dfn, crit=crit, dodge=dodge)
def exp_dmg(raw, crit, ed): return max(2, raw*(1+crit/100*0.65) - ed*0.6)
def comp_dmg(level, ed):  # P1 lynx: base 6 + 2.4/level (+agi term 0 at agi 1) ; E[crit]=*1.12
    base = 6 + math.floor(level*2.4) + math.floor(1*0.6)
    return max(2, base*1.12 - ed*0.45)
def comp_maxhp(level): return 24 + (level-1)*7  # P1 lynx
def enemy_hits_to_kill_player(eatk, p):
    return round(p['maxhp'] / max(1, eatk - round(p['def_']*0.65)), 1)

level, xp_pool = 1, 0
SNAP = {}
print(f"XP growth parsed: x{XP_GROWTH} | side-boss tune parsed: {TUNE}")
print(f"{'Flr':>4} {'Lvl':>4} {'P.ATK':>6} {'P.HP':>6} {'avgHP':>6} {'TTK':>5} {'+comp':>6} {'eATK':>5} {'hits2die':>9}")
for d in list(range(1,11)) + [12,15,18,21,24,27,30,33,36,40,45,50]:
    pool = POOLS.get(d, ABYSS_POOL)
    stats = [estats(a,d) for a in pool]
    rooms = min(18, 9 + d)
    spawns = (rooms - 2) * (1.65 if d < 3 else 2.0)
    xp_floor = (sum(s[3] for s in stats) / len(pool)) * spawns
    xp_pool += xp_floor
    while xp_pool >= xp_to_next(level): xp_pool -= xp_to_next(level); level += 1
    p = player_at(level, min(d,10) if d>10 else d)
    if d > 10: p = player_at(level, 10)  # gear quality saturates: audit convention
    SNAP[d] = (level, p)
    avg_hp = sum(s[0] for s in stats)/len(pool); avg_def = sum(s[2] for s in stats)/len(pool)
    avg_atk = sum(s[1] for s in stats)/len(pool)
    pd = exp_dmg(p['atk'], p['crit'], avg_def)
    ttk = avg_hp/pd; ttk_c = avg_hp/(pd+comp_dmg(level, avg_def))
    print(f"{d:>4} {level:>4} {p['atk']:>6} {p['maxhp']:>6} {avg_hp:>6.0f} {ttk:>5.1f} {ttk_c:>6.1f} {avg_atk:>5.0f} {enemy_hits_to_kill_player(avg_atk,p):>9}")

print("\nBosses (player at expected arrival level):")
for name,(hp,atk,df,xp) in BOSSES.items():
    arr = {'Vaelen F2':6,'Serath F4':11,'Malakor F5':13}[name]
    p = player_at(arr, 2 if 'Vaelen' in name else 4 if 'Serath' in name else 5)
    dmg = exp_dmg(p['atk'], p['crit'], df)
    tele = max(1, round(atk*1.45) - round(p['def_']*0.7))
    print(f"  {name}: HP {hp} ATK {atk} DEF {df} | player L{arr} dmg/hit {dmg:.0f} TTK {hp/dmg:.1f} | boss basic {max(1,atk-round(p['def_']*0.65))}/hit, telegraph {tele}/hit vs player HP {p['maxhp']}")
print("\nSide bosses (promoted randboss + P1 tune):")
for bid, arch, effd, arr in [('boss_morvath','dread_wraith',4,9),('boss_vexis','blight_weaver',5,10),('boss_kaelthar','obsidian_warden',7,12)]:
    hp,atk,df,xp = estats(arch, effd)
    hp, atk, df = round(hp*RAND[0]), round(atk*RAND[1]), df+RAND[2]
    th, ta = TUNE[bid]; hp, atk = round(hp*th), round(atk*ta)
    p = player_at(arr, 5)
    dmg = exp_dmg(p['atk'], p['crit'], df)
    print(f"  {bid}: HP {hp} ATK {atk} DEF {df} | player L{arr} TTK {hp/dmg:.1f} | basic {max(1,atk-round(p['def_']*0.65))}/hit vs HP {p['maxhp']}")
print("\nPhase 3 archetypes (side-dungeon gates + Abyss; player = main-progression snapshot at that depth):")
for arch, depths in [('grave_husk',[2,3,6,10]), ('spore_hulk',[3,4,6,10]), ('rime_revenant',[4,5,6,10])]:
    for d in depths:
        lvl, p = SNAP[d]
        hp, atk, df, xp = estats(arch, d)
        pd = exp_dmg(p['atk'], p['crit'], df)
        print(f"  {arch} @depth {d}: HP {hp} ATK {atk} DEF {df} XP {xp} | player L{lvl} TTK {hp/pd:.1f} hits | enemy hits-to-die {enemy_hits_to_kill_player(atk,p)}")

print(f"\nCompanion (lynx): L5 maxHP {comp_maxhp(5)}, L8 {comp_maxhp(8)}, L12 {comp_maxhp(12)}, L20 {comp_maxhp(20)}; dmg/hit at L8 vs def 6: {comp_dmg(8,6):.0f}")
print(f"Potion at maxHp 194: heals {max(24, round(194*0.35))} HP (was flat 24); at maxHp 61: {max(24, round(61*0.35))}")

# --- Phase 4 difficulty tiers -------------------------------------------------
# Multipliers parsed from src/game/difficulty.ts. Everything above is the
# Standard tier (all multipliers 1.0, i.e. the P1 numbers unchanged); this
# section only ADDS the Story/Hardened headline numbers.
D = open('src/game/difficulty.ts').read()
TIERS = {name: (float(hp), float(atk), float(xp)) for name, hp, atk, xp in
         re.findall(r"(\w+): \{ enemyHp: ([\d.]+), enemyAtk: ([\d.]+), xp: ([\d.]+) \}", D)}
print(f"\nDifficulty tiers (Phase 4, parsed from difficulty.ts): {TIERS}")
m_hp, m_atk, m_def, m_xp = BOSSES['Malakor F5']
mp = player_at(13, 5)
m_dmg = exp_dmg(mp['atk'], mp['crit'], m_def)
for tier in ['story', 'hardened']:
    ehp, eatk, expm = TIERS[tier]
    s_hp, s_atk = round(m_hp * ehp), round(m_atk * eatk)
    print(f"  {tier.capitalize():>8}: Malakor HP {s_hp} ATK {s_atk} DEF {m_def} | player L13 dmg/hit {m_dmg:.0f} TTK {s_hp/m_dmg:.1f} | XP reward {round(m_xp*expm)} (x{expm}) | boss basic {max(1,s_atk-round(mp['def_']*0.65))}/hit vs player HP {mp['maxhp']}")

# --- Phase 5 NG+ ascension cycles ----------------------------------------------
# Cycle factors parsed from cycleMultipliers in difficulty.ts; they compose
# multiplicatively with the tier above. Cycle 0 is exactly the Phase 4 game.
CYC = (float(re.search(r"enemyHp: 1 \+ ([\d.]+) \* c", D).group(1)),
       float(re.search(r"enemyAtk: 1 \+ ([\d.]+) \* c", D).group(1)),
       float(re.search(r"xp: 1 \+ ([\d.]+) \* c", D).group(1)))
print(f"\nNG+ ascension (Phase 5, per-cycle factors parsed from difficulty.ts): HP +{CYC[0]}, ATK +{CYC[1]}, XP +{CYC[2]}")
for cyc in [1, 3]:
    f_hp, f_atk, f_xp = 1 + CYC[0]*cyc, 1 + CYC[1]*cyc, 1 + CYC[2]*cyc
    n_hp, n_atk = round(m_hp * f_hp), round(m_atk * f_atk)
    print(f"  NG+{cyc} (Standard, cycle {cyc}): Malakor HP {n_hp} ATK {n_atk} DEF {m_def} | player L13 dmg/hit {m_dmg:.0f} TTK {n_hp/m_dmg:.1f} | XP reward {round(m_xp*f_xp)} (x{f_xp}) | boss basic {max(1,n_atk-round(mp['def_']*0.65))}/hit vs player HP {mp['maxhp']}")
