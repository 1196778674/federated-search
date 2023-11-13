import React, { Children, FC, useCallback, useRef, useState, useMemo, useEffect, MouseEventHandler } from 'react'
import styled from 'styled-components'

import FilterOutlined from '@ant-design/icons/FilterOutlined'
import CloseOutlined from '@ant-design/icons/CloseOutlined'
import SearchOutlined from '@ant-design/icons/SearchOutlined'
import LoadingOutlined from '@ant-design/icons/LoadingOutlined'

import { ExposedMethods, UserSelectProps, UserSelect } from './UserSelect'
import { Expression, ExpressionValue, EditingPart } from './Expression'

const DEFAULT_ACTION = 'default action'

export interface SearchProps {
  /**
   * 不可编辑项
   */
  notEditable?: string[]
  /**
   * 受控的条件表达式集合
   */
  value?: ExpressionValue[]
  /**
   * 文本占位符
   */
  placeholder?: string
  /**
   * 正在加载状态
   */
  loading?: boolean

  /**
   * 获取用户输入的字符串
   */
  onInput?: (
    plainText: string,
    editingIndex: number,
    editingPart: EditingPart
  ) => void
  /**
   * 在编辑表达式字段名时, 若无法找到对应的选择项, 则在用户按下回车时, 触发的按文本搜索事件
   */
  onSearch?: (plainText: string) => void
  /**
   * 表达式集合变化事件
   */
  onChange?: (value: ExpressionValue[]) => void
  children?: any
}

/**
 * 为表达式提供字段名的选择项数据结构
 */
interface GroupDatum {
  label: string
  value: string | number
  /**
   * 条件保持唯一
   */
  unique?: boolean
  children: ItemDatum[]
}

/**
 * 为表达式提供字段值的选择项数据结构
 */
interface ItemDatum {
  label: string
  value: string | number | boolean
}

/**
 * 表达式字段名选择项数据声明
 */
export interface GroupProps {
  label: string
  value: string | number
  /**
   * 条件保持唯一
   */
  unique?: boolean
  children?: React.ReactElement<ItemProps> | React.ReactElement<ItemProps>[]
}

/**
 * 表达式字段值选择项数据声明
 */
export interface ItemProps {
  label: string
  value: string | number | boolean
}

function isGroupProps(suspect: unknown): suspect is GroupProps {
  /**
   * TODO: 文档让咋写就咋写, 想让爷给你检查? 哎呀~~ 给爷爬~~
   */
  return true
}

function isItemProps(suspect: unknown): suspect is ItemProps {
  /**
   * TODO: 文档让咋写就咋写, 想让爷给你检查? 哎呀~~ 给爷爬~~
   */
  return true
}

/**
 * 搜索表达式编辑组件
 */
export const Search: FC<SearchProps> & { 
  /**
   * 声明式数据 - 字段名选择项
   */
  Group: FC<GroupProps>, 
  /**
   * 声明式数据 - 字段值选择项
   */
  Item: FC<ItemProps> 
} = props => {
  const { value = [], children, placeholder = 'Search or filter results...', loading, onInput, onSearch, onChange, notEditable } = props

  const inputRef = useRef<ExposedMethods>(null)

  // 用户当前的输入文本
  const [searchText, setSearchText] = useState('')
  // 可清除表达式集合
  const clearableExpressions = useMemo(() => value.filter(item => !item.readonly), [value])

  // 正在编辑的表达式索引
  const [editingIndex, setEditingIndex] = useState(0)
  // 正在编辑的表达式部分
  const [editingPart, setEditingPart] = useState<EditingPart>(EditingPart.NONE)
  // input是否可以编辑
  const [editable, setEditable] = useState<boolean>(false)

  //#region 通过声明式约束解析组件的 children 获得的声明式数据
  /**
   * 声明式数据
   */
  const groups = useMemo<GroupDatum[]>(() => {
    const groups = Children.map(children, a => a)?.reduce((acc: any, child: any) => {
        if (!React.isValidElement(child)) {
          return acc
        }
        if (!isGroupProps(child.props)) {
          return acc
        }

        const children = Children
          .map(child.props.children, a => a)
          ?.reduce<ItemDatum[]>((acc, child) => {
            if (!React.isValidElement(child)) {
              return acc
            }
            if (!isItemProps(child.props)) {
              return acc
            }

            acc.push({ label: child.props.label, value: child.props.value })

            return acc
          }, []) ?? []

        acc.push({ label: child.props.label, value: child.props.value, unique: child.props.unique, children })

        return acc
      }, []) ?? []

    return groups
  }, [children])

  /**
   * 当前可选字段名
   */
  const groupOptions = useMemo<GroupDatum[]>(() => {
    return groups.filter(item => {
      if (item.unique) {
        return !value.find(expr => expr.name === item.value) && (!searchText?.trim() || item.label.includes(searchText.trim()))
      }

      return !searchText?.trim() || item.label.includes(searchText.trim())
    })
  }, [groups, searchText, value])

  /**
   * 当前可选字段值
   */
  const itemOptions = useMemo<ItemProps[]>(() => {
    const currentExpr = value[editingIndex]
    if (!currentExpr) {
      return []
    }

    const currentGroup = groups.find(item => item.value === currentExpr.name)
    if (!currentGroup) {
      return []
    }

    return currentGroup.children.filter(item => !searchText?.trim() || item.label.includes(searchText.trim()))
  }, [editingIndex, groups, searchText, value])
  //#endregion

  /**
   * onChange 事件
   * 执行onChange之前使输入框可用
  */
  const onChangeFun = useCallback((val: any) => {
    !val.length && setEditable(false)
    onChange && onChange(val)
  }, [onChange])

  /**
   * Search 输入框点击事件
   */
  const handleClick = useCallback<MouseEventHandler>((event) => {
    event.nativeEvent.stopPropagation()
    
    inputRef.current?.focus()
  }, [])

  /**
   * 文本输入框输入事件
   */
  const handleInput = useCallback<Required<UserSelectProps>['onInput']>((text) => {
    setSearchText(text)

    onInput && onInput(text, editingIndex, editingPart)
  }, [editingIndex, editingPart, onInput])

  /**
   * 可选项选择事件
   */
  const handleSelect = useCallback<Required<UserSelectProps>['onSelect']>((selected) => {
    if (editingPart === EditingPart.FIELD_NAME) {
      /*
       * 触发默认动作, 这里认为是立即搜索
       */
      if (selected === DEFAULT_ACTION) {
        onSearch && onSearch(searchText)
        return
      }

      /*
       * 当用户正在编辑字段名时, 做了选择决定, 则根据做出决定时得到的值或文本, 在声明式数据中查找对应的字段名选择项
       * - 若能找到, 则根据找到的字段名创建表达式, 并更新到表达式集合中对应的索引位置上
       * - 若找不到, 则什么也别做了
       */
      const targetGroup = groups.find((item) => item.value === selected)
      if (!targetGroup) {
        return
      }

      const previous = [...value]

      previous[editingIndex] = {
        label: targetGroup.label,
        name: targetGroup.value,
        value: [],
      }

      setSearchText('')

      onInput && onInput('', editingIndex, EditingPart.FIELD_NAME)
      onChangeFun(previous)
    } else if (editingPart === EditingPart.FIELD_VALUE) {
      /*
       * 当用户在编辑字段值时, 做了选择决定, 则根据做出决定时得到的值或文本, 在声明式数据中查找对应的字段值选择项
       * 配合根据当前正在编辑字段索引等上下文信息定位到的表达式, 对表达式进行跟新
       * - 若能在声明式数据中找到对应的选择项数据, 则将选择项数据写入表达式
       * - 若不能在声明式数据中找到对应的选择项数据, 则将当前输入文本写入表达式
       */

      const currentExpr = value[editingIndex]
      if (!currentExpr) {
        return
      }

      const currentGroup = groups.find(item => item.value === currentExpr.name)
      if (!currentGroup) {
        return
      }

      const previous = [...value]
      const item = currentGroup.children.find(item => item.value === selected)

      if (!item && searchText) {
        previous[editingIndex] = {
          ...previous[editingIndex],
          value: [[searchText, searchText]]
        }
      } else if (item) {
        previous[editingIndex] = {
          ...previous[editingIndex],
          value: [[item.label, item.value]]
        }
      }

      setSearchText('')

      onInput && onInput('', editingIndex, EditingPart.FIELD_VALUE)
      onChangeFun(previous)
    }

    setEditable(notEditable?.includes(selected as string) ?? false)
  }, [editingIndex, editingPart, groups, notEditable, onChangeFun, onInput, onSearch, searchText, value])

  /**
   * 表达式值点击事件
   */
  const handleValueClick = useCallback((index: number) => () => {
    inputRef.current?.focus()

    const previous = [...value]
    const expr = previous[index]
    if (notEditable?.includes(expr.name as string)) return

    expr.value[0] && setSearchText(expr.value[0][0])

    setEditingIndex(index)
    setEditingPart(EditingPart.FIELD_VALUE)
  }, [notEditable, value])

  /**
   * 表达式删除事件
   */
  const handleValueClose = useCallback((index: number) => () => {
    inputRef.current?.focus()

    const next = value.filter((_, current) => current !== index)

    setSearchText('')

    onChangeFun(next)
  }, [onChangeFun, value])

  /**
   * Search 输入框失去焦点事件
   */
  const handleBlur = useCallback(() => {
    if (searchText.trim() === '') {
      return
    }
    if (editingPart !== EditingPart.FIELD_VALUE) {
      return
    }

    const previous = [...value]
    const currentExpr = previous[editingIndex]

    if (!currentExpr) {
      return
    }

    const currentGroup = groups.find(item => item.value === currentExpr.name)
    if (!currentGroup) {
      return
    }

    /**
     * 失去焦点时, 应将当前表达式状态视为最新状态来触发表达式变化事件 onChange
     */

    const currentItem = currentGroup.children.find(item => item.label === searchText || item.value === searchText)
    if (!currentItem) {
      previous[editingIndex] = {
        ...currentExpr,
        value: [[searchText, searchText]]
      }
    } else {
      previous[editingIndex] = {
        ...currentExpr,
        value: [[currentItem.label, currentItem.value]]
      }
    }

    setSearchText('')

    onInput && onInput('', editingIndex, EditingPart.FIELD_VALUE)
    onChangeFun(previous)
  }, [editingIndex, editingPart, groups, onChangeFun, onInput, searchText, value])

  /**
   * Backspace 按键事件
   */
  const handleBackspace = useCallback(() => {
    if (searchText !== '') {
      return
    }

    if (value.length === 0) {
      return
    }
    
    // 不可编辑状态直接清除 name，目前只有故障等级不可编辑
    setEditable(notEditable?.includes(value[value.length - 1].name as string) ?? false)
    if (notEditable?.includes(value[value.length - 1].name as string) && value[value.length - 1].value.length) {
      const previous = [...value]
      const current = previous[editingIndex - 1]
      previous[editingIndex - 1] = {
        ...current,
        value: [],
      }
      onChangeFun(previous)
      return
    }

    /*
     * 在用户编辑表达式过程中, 按下 Backspace (退格) 键, 需要对当前表达式编辑部分做出判断
     * - 若编辑字段名部分, 则仅清空表达式字段值部分, 并将当前状态视为最新状态, 触发表达式集合变化事件 onChange
     * - 若编辑字段值部分, 则删除当前表达式, 触发表达式集合变化事件 onChange
     */

    if (editingPart === EditingPart.FIELD_VALUE) {
      onChangeFun([...value.slice(0, editingIndex), ...value.slice(editingIndex + 1)])
      return
    }

    if (editingPart === EditingPart.FIELD_NAME) {
      const previous = [...value]
      const current = previous[editingIndex - 1]
      const values = current.value[0]

      previous[editingIndex - 1] = {
        ...current,
        value: [],
      }

      values && setSearchText(values[0])

      onChangeFun(previous)
      return
    }
  }, [editingIndex, editingPart, notEditable, onChangeFun, searchText, value])

  /**
   * 用户点击清除所有可删除表达式事件
   */
  const handleClear = useCallback(() => {
    setSearchText('')

    onChangeFun(value.filter((item) => item.readonly))
  }, [onChangeFun, value])

  useEffect(() => {
    /*
     * 根据当前表达式集合中的数据完整程度, 推断当前表达式编辑状态的上下文
     * - 表达式正在编辑部分
     * - 表达式在表达式集合中的索引
     */

    if (value.length === 0) {
      setEditingPart(EditingPart.FIELD_NAME)
      setEditingIndex(0)
      return
    }

    for (let i = 0; i < value.length; i++) {
      const item = value[i]
      if (item.label.trim() === '') {
        setEditingPart(EditingPart.FIELD_NAME)
        setEditingIndex(i)
        return
      }

      if (item.value.length === 0) {
        setEditingPart(EditingPart.FIELD_VALUE)
        setEditingIndex(i)
        return
      }
    }

    setEditingPart(EditingPart.FIELD_NAME)
    setEditingIndex(value.length)
  }, [value])

  return (
    <Container className='ant-input' onClick={ handleClick }>
      <ExpressionGroup>
        {/* 条件表达式需要分隔成两个部分来声明, 因为存在编辑中间表达式的情况 */}

        {/* 条件表达式上半部分 */ }
        { value.slice(0, editingIndex + 1).map((expr, index) => (
          <React.Fragment key={ [expr.name, index].join('-') }>
            <Expression value={ expr }
              editingPart={ editingIndex === index ? editingPart : EditingPart.NONE }
              onLabelClick={ handleValueClick(index) }
              onValueClick={ handleValueClick(index) }
              onRemove={ handleValueClose(index) }
            />
          </React.Fragment>
        )) }

        {/* 用户输入内容 */ }
        <UserSelect ref={ inputRef }
          value={ searchText }
          placeholder={ value.length === 0 ? placeholder : '' }
          onInput={ handleInput }
          onSelect={ handleSelect }
          onBlur={ handleBlur }
          onBackspace={handleBackspace}
          editable={editable}
        >
          { itemOptions.length === 0 &&
            <UserSelect.Option key={ DEFAULT_ACTION } icon={ <SearchOutlined style={ { marginRight: 8 } } /> } label='' value={ DEFAULT_ACTION } />
          }

          { editingPart === EditingPart.FIELD_NAME &&
            groupOptions.map(item => (
              <UserSelect.Option key={ item.value } label={ item.label } value={ item.value } />
            ))
          }

          { editingPart === EditingPart.FIELD_VALUE &&
            itemOptions.map(item => (
              <UserSelect.Option key={ item.value.toString() } label={ item.label } value={ item.value } />
            ))
          }
        </UserSelect>

        {/* 条件表达式下半部分 */ }
        { value.slice(editingIndex + 1).map((expr, index) => (
          <React.Fragment key={ [expr.name, index].join('-') }>
            <Expression value={ expr }
              editingPart={ editingIndex === index + editingIndex + 1 ? editingPart : EditingPart.NONE }
              onLabelClick={ handleValueClick(index + editingIndex + 1) }
              onValueClick={ handleValueClick(index + editingIndex + 1) }
              onRemove={ handleValueClose(index + editingIndex + 1) }
            />
          </React.Fragment>
        )) }
      </ExpressionGroup>

      { (clearableExpressions.length > 0 || searchText.length > 0) && <CloseOutlined style={ { marginLeft: 8, fontSize: 12, opacity: 0.4 } } onClick={ handleClear } /> }

      { loading && <LoadingOutlined style={ { marginLeft: 8 } } /> }

      <FilterOutlined style={ { marginLeft: 8 } } />
    </Container>
  )
}

export const Group: FC<GroupProps> = () => null

Search.Group = Group

export const Item: FC<ItemProps> = () => null

Search.Item = Item

const Container = styled.div`
  min-height: 32px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  &:focus-within {
    border-color: ${props => props.theme['primary-color'] ?? '#40a9ff'};
    box-shadow: 0 0 0 2px ${props => props.theme['primary-color'] ? `${props.theme['primary-color']}33` : '#40a9ff33'};
  }
`
const ExpressionGroup = styled.div`
  flex: 1;
  flex-flow: row wrap;

  display: flex;
  align-items: center;
  gap: 8px;

  cursor: text;
`
