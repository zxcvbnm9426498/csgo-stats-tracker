import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';

interface MatchData {
  matchId: string;
  mapName: string;
  score1: number;
  score2: number;
  startTime: string;
  pvpScore: number;
  pvpScoreChange: number;
  timeStamp: number;
  team: number;
  winTeam: number;
  kill: number;
  death: number;
  assist: number;
  rating: number;
  mapLogo?: string;
}

interface MatchHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: MatchData[];
}

const ITEMS_PER_PAGE = 20;

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({
  open,
  onOpenChange,
  matches
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  // 计算总页数
  const totalPages = Math.ceil(matches.length / ITEMS_PER_PAGE);
  
  // 获取当前页的比赛数据
  const currentPageMatches = matches.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  // 格式化日期时间
  const formatMatchDate = (timestamp: number) => {
    if (!timestamp) return '未知时间';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // 获取评分颜色
  const getRatingColor = (rating: number | string) => {
    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    
    if (numRating >= 2.0) return 'text-purple-600';
    if (numRating >= 1.5) return 'text-green-600';
    if (numRating >= 1.0) return 'text-blue-600';
    if (numRating >= 0.85) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // 处理页面变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // 生成分页按钮
  const generatePaginationItems = (): React.ReactElement[] => {
    const items: React.ReactElement[] = [];
    const maxDisplayedPages = 5; // 最多显示的页码数
    
    let startPage = Math.max(1, currentPage - Math.floor(maxDisplayedPages / 2));
    let endPage = Math.min(totalPages, startPage + maxDisplayedPages - 1);
    
    // 调整起始页，确保显示足够的页码
    if (endPage - startPage + 1 < maxDisplayedPages) {
      startPage = Math.max(1, endPage - maxDisplayedPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageChange(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return items;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">完整比赛记录</DialogTitle>
        </DialogHeader>
        
        {matches.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地图</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">比分</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">K/D/A</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ELO变化</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPageMatches.map((match, index) => (
                    <tr key={match.matchId || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {match.mapLogo && (
                            <img 
                              src={match.mapLogo} 
                              alt={match.mapName} 
                              className="h-8 w-8 mr-2 rounded"
                            />
                          )}
                          <span>{match.mapName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          match.team === 1 
                            ? (match.score1 > match.score2 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                            : (match.score2 > match.score1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                        }`}>
                          {match.score1} : {match.score2}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatMatchDate(match.timeStamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="font-medium text-gray-900">{match.kill}</span>
                        <span className="text-gray-500"> / </span>
                        <span className="font-medium text-gray-900">{match.death}</span>
                        <span className="text-gray-500"> / </span>
                        <span className="font-medium text-gray-900">{match.assist}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`font-medium ${getRatingColor(match.rating)}`}>
                          {typeof match.rating === 'number' ? match.rating.toFixed(2) : match.rating}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`font-medium ${match.pvpScoreChange > 0 ? 'text-green-600' : match.pvpScoreChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {match.pvpScoreChange > 0 ? '+' : ''}{match.pvpScoreChange}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} />
                    </PaginationItem>
                  )}
                  
                  {generatePaginationItems()}
                  
                  {currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationNext onClick={() => handlePageChange(currentPage + 1)} />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">暂无比赛记录可显示</p>
          </div>
        )}
        
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchHistoryModal; 