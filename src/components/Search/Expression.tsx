import React, { FC, useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'

import { Dropdown, Tag } from 'antd'
import { TagProps } from 'antd/lib/tag'
import { ISymbolProps } from './Search'

/**
 * 表达式数据结构
 */
export interface ExpressionValue {
  /**
   * 人类可读标签
   */
  label: string
  /**
   * 表达式字段名
   */
  name: string | number
  /**
   * 表达式字段值
   * 为什么要设计成数组? 为了将来能够支持多选留下可扩展空间
   */
  value: [string, string | number | boolean][]
  /**
   * 表达式只读, 此表达式不可编辑或删除
   */
  readonly?: boolean
  /**
   * 符号是否可以选择
  */
  symbol?: ISymbolProps
}

export interface ExpressionProps {
  value?: ExpressionValue
  editingPart: EditingPart

  /**
   * 当用户点击字段名时
   */
  onLabelClick?: () => void
  /**
   * 当用户点击字段值时
   */
  onValueClick?: () => void
  /**
   * 当用户点击字段关闭时
   */
  onRemove?: () => void
  /**
   * 当用户修改symbol时
  */
  onSymbolChange?: (symbol: ISymbolProps) => void
}

/**
 * 正在编辑的表达式位置
 */
export enum EditingPart {
  /**
   * 没有编辑任何部分
   */
  NONE = 'none',
  /**
   * 正在编辑字段名
   */
  FIELD_NAME = 'fieldName',
  /**
   * 正在编辑字段值
   */
  FIELD_VALUE = 'fieldValue'
}

/**
 * 表达式
 * @returns 
 */
export const Expression: FC<ExpressionProps> = props => {
  const { value, editingPart, onLabelClick, onValueClick, onRemove, onSymbolChange } = props

  const handleChangeSelect = useCallback((symbol: any) => {
    setSymbolChecked(symbol)
    onSymbolChange && onSymbolChange(symbol)
  }, [onSymbolChange])

  const symbolList = useMemo(() => [
    { label: <div onClick={() => handleChangeSelect('=')}>{'='}</div>, key: '='},
    { label: <div onClick={() => handleChangeSelect('>')}>{'>'}</div>, key: '>'},
    { label: <div onClick={() => handleChangeSelect('<')}>{'<'}</div>, key: '<'},
    { label: <div onClick={() => handleChangeSelect('!=')}>{'!='}</div>, key: '!='},
  ], [handleChangeSelect])

  const [symbolChecked, setSymbolChecked] = useState(value?.symbol ?? symbolList[0].key)

  const handleClose = useCallback<Required<TagProps>['onClick']>((e) => {
    e.preventDefault()
    e.stopPropagation()

    onRemove && onRemove()
  }, [onRemove])

  return (
    <Container className='bizseer-ui-search-expr' onClick={ e => e.stopPropagation() }>
      { value?.label && <Tag onClick={ value.readonly ? undefined : onLabelClick }>{ value?.label }</Tag> }
      {/* { value?.label && <Tag onClick={ value.readonly ? undefined : onLabelClick }>=</Tag> } */}
      {value?.label && <>
        {value.symbol ?
          <Dropdown menu={{items: symbolList}}>
            <Tag style={{cursor: 'pointer'}}>{symbolChecked}</Tag>
          </Dropdown> : <Tag onClick={ value.readonly ? undefined : onLabelClick }>=</Tag>}
      </>}
      { !!value?.value.length && editingPart !== EditingPart.FIELD_VALUE &&
        value.value.map(item => (
          <Tag key={ item[0] } color='blue' closable={ !value.readonly }
            onClick={ value.readonly ? undefined : onValueClick }
            onClose={ value.readonly ? undefined : handleClose }>
            { item[0] }
          </Tag>
        ))
      }
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-flow: row nowrap;
  align-items: center;

  .ant-tag:not(:last-child) {
    margin-right: 2px;
  }

  .ant-tag:last-child {
    margin-right: 0;
  }
`
