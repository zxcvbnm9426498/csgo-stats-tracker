import axios from 'axios';
import { randomUUID } from 'crypto';
import * as cheerio from 'cheerio';

// 常量定义
const TIME_STAMP = Math.floor(Date.now() / 1000);
const APP_VERSION = "3.5.9";
const USER_AGENTS = [
  "esport-app/3.5.9 (com.wmzq.esportapp; build:2; iOS 18.4.0) Alamofire/5.10.2",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 EsportsApp Version=3.5.9",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
];

// API地址
const SEARCH_API_URL = "https://gwapi.pwesports.cn/acty/api/v1/search";
const USER_INFO_API_URL = "https://gwapi.pwesports.cn/appuser/community/user/getUserBasicInfo";
const COLA_USER_INFO_URL = "https://www.4cola.com/api/csgo/get_user_info";
const COLA_PLAYER_STATS_URL = "https://www.4cola.com/api/csgo/get_player_stats";
const COLA_RECORD_BASE_URL = "https://www.4cola.com/record/";

// 请求头
const getSearchApiHeaders = () => ({
  "Host": "gwapi.pwesports.cn",
  "Accept": "*/*",
  "appversion": APP_VERSION,
  "gameTypeStr": "2",
  "Accept-Encoding": "br;q=1.0, gzip;q=0.9, deflate;q=0.8",
  "Accept-Language": "zh-Hans-CN;q=1.0",
  "platform": "ios",
  "appTheme": "0",
  "t": String(Math.floor(Date.now() / 1000)),
  "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
  "gameType": "2",
  "Connection": "keep-alive",
  "Content-Type": "application/json"
});

const getAlternativeApiHeaders = () => ({
  "X-Requested-With": "XMLHttpRequest",
  "appversion": APP_VERSION,
  "platform": "h5_ios",
  "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
  "Referer": "https://news.wmpvp.com/",
  "Accept": "application/json, text/plain, */*"
});

const getColaApiHeaders = () => ({
  "accept": "application/json, text/plain, */*",
  "accept-encoding": "gzip, deflate, br, zstd",
  "accept-language": "zh-CN,zh;q=0.9",
  "cache-control": "no-cache",
  "content-type": "application/json",
  "origin": "https://www.4cola.com",
  "pragma": "no-cache",
  "referer": "https://www.4cola.com/record",
  "sec-ch-ua": '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
});

const getColaWebHeaders = () => ({
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-encoding": "gzip, deflate, br, zstd",
  "accept-language": "zh-CN,zh;q=0.9",
  "cache-control": "no-cache",
  "pragma": "no-cache",
  "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"macOS\"",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
  "user-agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
});

// 类型定义
interface PlayerData {
  steamId64Str: string;
  steamId64?: string;
  name: string | null;
}

interface Weapon {
  rank: string;
  name: string;
  kills: string;
  shots: string;
  hits: string;
  accuracy: string;
}

interface Map {
  rank: string;
  name: string;
  rounds: string;
  wins: string;
  winrate: string;
}

interface DetailedStats {
  player_name: string;
  main_stats: Record<string, string>;
  detailed_stats: Record<string, Record<string, string>>;
  weapons: Weapon[];
  maps: Map[];
}

// 通过用户ID搜索玩家
export async function searchById(searchText: string) {
  try {
    // 先尝试使用搜索API
    const playerData = await searchPlayerById(searchText);
    
    if (playerData) {
      return await getPlayerFullData(playerData);
    }
    
    // 如果搜索API未返回结果，尝试备用API
    const altPlayerData = await getSteamIdFromAlternativeApi(searchText);
    
    if (altPlayerData && altPlayerData.steam_id) {
      return await getPlayerFullData({
        steamId64Str: altPlayerData.steam_id,
        name: altPlayerData.nickname
      });
    }
    
    return null;
  } catch (error) {
    console.error('搜索玩家时出错:', error);
    return null;
  }
}

// 通过Steam ID直接搜索玩家
export async function searchBySteamId(steamId: string) {
  try {
    return await getPlayerFullData({
      steamId64Str: steamId,
      name: null
    });
  } catch (error) {
    console.error('通过Steam ID搜索玩家时出错:', error);
    return null;
  }
}

// 获取玩家完整数据
async function getPlayerFullData(playerData: PlayerData) {
  try {
    if (!playerData.steamId64Str) {
      return null;
    }
    
    // 从4cola获取用户信息
    const userInfo = await getUserInfo(playerData.steamId64Str);
    
    // 从4cola获取玩家统计数据
    const playerStats = await getPlayerStats(playerData.steamId64Str);
    
    let detailedStats = null;
    if (playerStats && playerStats.code === 1 && playerStats.data) {
      const recordId = playerStats.data.id;
      if (recordId) {
        // 解析网页获取详细数据
        detailedStats = await parsePlayerRecord(recordId);
      }
    }
    
    return {
      playerInfo: playerData,
      userInfo: userInfo || null,
      playerStats: playerStats || null,
      detailedStats
    };
  } catch (error) {
    console.error('获取玩家完整数据时出错:', error);
    return null;
  }
}

// 通过ID搜索玩家
async function searchPlayerById(searchText: string): Promise<PlayerData | null> {
  try {
    const headers = getSearchApiHeaders();
    const payload = {
      "platform": "ios",
      "pageSize": 20,
      "gameTypeStr": "2",
      "t": Math.floor(Date.now() / 1000),
      "text": searchText,
      "gameAbbr": "CSGO",
      "appVersion": APP_VERSION,
      "searchType": "ALL",
      "page": 1
    };
    
    const response = await axios.post(SEARCH_API_URL, payload, { headers });
    
    if (response.data && response.data.result) {
      for (const i of response.data.result) {
        if (i.data && i.data.length > 0) {
          const playerData = i.data[0];
          return {
            steamId64Str: playerData.steamId64Str,
            steamId64: playerData.steamId64,
            name: playerData.name
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('通过ID搜索玩家时出错:', error);
    return null;
  }
}

// 从备用API获取Steam ID
async function getSteamIdFromAlternativeApi(userId: string) {
  try {
    const headers = getAlternativeApiHeaders();
    const params = {
      toUserId: userId
    };
    
    const response = await axios.get(USER_INFO_API_URL, {
      headers,
      params
    });
    
    const data = response.data;
    
    if (data.code === 0 && data.message === "success") {
      const result = data.result || {};
      const communityUser = result.communityUser || {};
      const steamId = communityUser.steamId;
      
      let nickname = null;
      if (communityUser.communityUserItem) {
        nickname = communityUser.communityUserItem.nickname;
      }
      
      return {
        user_id: userId,
        steam_id: steamId,
        nickname: nickname
      };
    }
    
    return null;
  } catch (error) {
    console.error('从备用API获取Steam ID时出错:', error);
    return null;
  }
}

// 获取用户信息
async function getUserInfo(steamId: string) {
  try {
    const headers = getColaApiHeaders();
    const payload = {
      steam_id: steamId
    };
    
    const response = await axios.post(COLA_USER_INFO_URL, payload, { headers });
    return response.data;
  } catch (error) {
    console.error('获取用户信息时出错:', error);
    return null;
  }
}

// 获取玩家统计数据
async function getPlayerStats(steamId: string) {
  try {
    const headers = getColaApiHeaders();
    const payload = {
      steam_id: steamId
    };
    
    const response = await axios.post(COLA_PLAYER_STATS_URL, payload, { headers });
    return response.data;
  } catch (error) {
    console.error('获取玩家统计数据时出错:', error);
    return null;
  }
}

// 解析玩家记录
async function parsePlayerRecord(recordId: string): Promise<DetailedStats | null> {
  try {
    const url = `${COLA_RECORD_BASE_URL}${recordId}`;
    const headers = getColaWebHeaders();
    
    const response = await axios.get(url, { headers });
    
    // 使用cheerio解析HTML
    const $ = cheerio.load(response.data);
    
    // 获取玩家名称
    const playerInfo = $('.v-card__title.text-h5');
    const playerName = playerInfo.length > 1 ? $(playerInfo[1]).text().trim() : "未知玩家";
    
    // 获取主要统计数据
    const stats: Record<string, string> = {};
    const statCards = $('.col-md-2.col-6 .v-card__subtitle.text-h5');
    const statTitles = $('.col-md-2.col-6 .v-card__title.text-subtitle-1 span');
    
    statTitles.each((i: number, elem: any) => {
      const title = $(elem).text().trim();
      const value = i < statCards.length ? $(statCards[i]).text().trim() : "N/A";
      stats[title] = value;
    });
    
    // 获取详细统计数据
    const detailedStats: Record<string, Record<string, string>> = {};
    const cards = $('.v-card.v-sheet.theme--light');
    
    cards.each((_: number, card: any) => {
      const titleElem = $(card).find('.v-card__title.subheading.font-weight-bold');
      if (titleElem.length === 0) return;
      
      const cardTitle = titleElem.text().trim();
      const cardStats: Record<string, string> = {};
      
      const listItems = $(card).find('.v-list-item');
      
      listItems.each((_: number, item: any) => {
        const columns = $(item).find('.v-list-item__content');
        if (columns.length >= 2) {
          const itemTitle = $(columns[0]).text().trim();
          const itemValue = $(columns[1]).text().trim();
          cardStats[itemTitle] = itemValue;
        }
      });
      
      detailedStats[cardTitle] = cardStats;
    });
    
    // 获取武器统计数据
    const weapons: Weapon[] = [];
    const weaponTables = $('.v-data-table.ma-1.theme--light');
    
    if (weaponTables.length >= 1) {
      const weaponTable = weaponTables.first();
      const weaponRows = weaponTable.find('tbody tr');
      
      weaponRows.each((i: number, row: any) => {
        if (i === 0) return; // 跳过标题行
        if (i > 5) return; // 只取前5个
        
        const weaponData = $(row).find('td');
        if (weaponData.length >= 6) {
          const weapon: Weapon = {
            rank: $(weaponData[0]).text().trim(),
            name: $(weaponData[1]).text().trim(),
            kills: $(weaponData[2]).text().trim(),
            shots: $(weaponData[3]).text().trim(),
            hits: $(weaponData[4]).text().trim(),
            accuracy: $(weaponData[5]).text().trim()
          };
          weapons.push(weapon);
        }
      });
    }
    
    // 获取地图统计数据
    const maps: Map[] = [];
    
    if (weaponTables.length >= 2) {
      const mapTable = weaponTables.eq(1);
      const mapRows = mapTable.find('tbody tr');
      
      mapRows.each((i: number, row: any) => {
        if (i === 0) return; // 跳过标题行
        if (i > 5) return; // 只取前5个
        
        const mapData = $(row).find('td');
        if (mapData.length >= 5) {
          const mapInfo: Map = {
            rank: $(mapData[0]).text().trim(),
            name: $(mapData[1]).text().trim(),
            rounds: $(mapData[2]).text().trim(),
            wins: $(mapData[3]).text().trim(),
            winrate: $(mapData[4]).text().trim()
          };
          maps.push(mapInfo);
        }
      });
    }
    
    // 返回所有解析的数据
    return {
      player_name: playerName,
      main_stats: stats,
      detailed_stats: detailedStats,
      weapons,
      maps
    };
  } catch (error) {
    console.error('解析玩家记录时出错:', error);
    return null;
  }
} 