import React from 'react';
import Link from 'next/link';

// 账号数据接口
interface AccountCardProps {
  id: string;
  username: string;
  userId?: string;
  steamId?: string;
  status: string;
  onClick: () => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ 
  id, 
  username, 
  userId, 
  steamId, 
  status,
  onClick
}) => {
  return (
    <div 
      className="bg-white rounded-lg shadow-md p-6 transition-all hover:shadow-lg cursor-pointer"
      onClick={onClick}
    >
      <h3 className="text-xl font-bold text-gray-800 mb-2 truncate">{username}</h3>
      
      <div className="space-y-2 mb-4">
        {userId && (
          <div className="text-sm">
            <span className="text-gray-600 font-medium">用户ID: </span>
            <span className="text-gray-800">{userId}</span>
          </div>
        )}
        
        {steamId && (
          <div className="text-sm">
            <span className="text-gray-600 font-medium">Steam ID: </span>
            <span className="text-gray-800">{steamId}</span>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center">
        <span 
          className={`px-2 py-1 text-xs rounded-full font-medium ${
            status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {status === 'active' ? '活跃' : '非活跃'}
        </span>
        
        <button 
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          查看详情
        </button>
      </div>
    </div>
  );
};

export default AccountCard; 