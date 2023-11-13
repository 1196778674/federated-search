import { useState, useCallback } from 'react'
import {
  Search, SearchProps,
  // ExpressionValue
} from '@/components/Search'
import { serializeConditions } from './utils'
import styled from 'styled-components'
import './App.css'

function App() {

  const [queryConditions, setQueryConditions] = useState<Required<SearchProps>['value']>([])
  // 故障信息关键词
  const [searchValue, setSearchValue] = useState<string>('')

  // 过滤条件发生变化, 由查询按钮点击事件发起查询
    const handleQueryConditionsChange = useCallback<Required<SearchProps>['onChange']>((value) => {
        setSearchValue('')
        setQueryConditions(value)
    }, [])

    // 输入值时,只针对模糊搜索时赋值
    const handleQueryConditionsInput = useCallback<Required<SearchProps>['onInput']>((val, index) => {
        if (!queryConditions[index]) {
            setSearchValue(val)
        }
    }, [queryConditions])

    // 关键词发生变化
    const handleQueryConditionSearch = useCallback<Required<SearchProps>['onSearch']>((text) => {
        setSearchValue(text)
        const serialized = serializeConditions(queryConditions)
        console.log('====================================');
        console.log(serialized, text, searchValue);
        console.log('====================================');
    }, [queryConditions])

  return (
    <>
      <Search
          placeholder="请选择筛选条件"
          value={queryConditions}
          onSearch={handleQueryConditionSearch}
          onChange={handleQueryConditionsChange}
          onInput={handleQueryConditionsInput}
      >
          <Search.Group label="条件1" value="task1" unique />
          <Search.Group label="条件2" value="task2" />
      </Search>
    </>
  )
}

export default App

export const SearchContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    .ant-popover-inner-content{
        padding: 4px;
    }
    .ant-tag {
        margin-right: 4px;
    }
`
export const ButtonGroupStyle = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    & > button {
        margin-left: 8px;
    }
`
