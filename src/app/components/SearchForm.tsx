import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

type SearchFormProps = {
  onSearch: (data: { searchType: string; searchId: string }) => void;
  isLoading: boolean;
};

type FormValues = {
  searchType: string;
  searchId: string;
};

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      searchType: 'userId',
      searchId: ''
    }
  });

  const onSubmit = (data: FormValues) => {
    onSearch(data);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">CSGO 玩家战绩查询</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">查询类型</label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                {...register('searchType')}
                value="userId"
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-gray-700 font-medium">用户ID</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                {...register('searchType')}
                value="steamId"
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-gray-700 font-medium">Steam ID</span>
            </label>
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="searchId" className="block text-sm font-medium text-gray-700">
            ID
          </label>
          <input
            id="searchId"
            {...register('searchId', { required: '请输入ID' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
            placeholder="输入ID进行查询"
          />
          {errors.searchId && (
            <p className="mt-1 text-sm text-red-600">{errors.searchId.message}</p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        >
          {isLoading ? '查询中...' : '查询'}
        </button>
      </form>
    </div>
  );
};

export default SearchForm; 