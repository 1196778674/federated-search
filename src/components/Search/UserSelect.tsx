import React, { FC, Children, useImperativeHandle, useMemo, useRef, useCallback, FormEventHandler, useState, useEffect } from 'react'
import styled from 'styled-components'

import { Popover } from 'antd'

/**
 * 通过 ref 暴露给调用端的方法
 */
export interface ExposedMethods {
  /**
   * 使文本框获得焦点
   */
  focus(): void,
  /**
   * 展开选择项列表
   */
  showOptions(): void,
  /**
   * 收起选择项列表
   */
  hideOptions(): void,
}

export interface UserSelectProps {
  /**
   * input是否可以编辑
   */
  editable?: boolean
  placeholder?: string
  children?: React.ReactNode

  value?: string

  /**
   * 用户按键输入时内容变更事件
   */
  onInput?: (text: string) => void
  /**
   * 用户通过鼠标点击选择项做出选择事件
   */
  onSelect?: (value: OptionProps['value']) => void
  /**
   * 文本框失去焦点事件
   */
  onBlur?: () => void
  /**
   * 用户通过键盘按退格键事件
   */
  onBackspace?: () => void
}

export interface OptionProps {
  label: string
  value: string | number | boolean
  icon?: JSX.Element
}

function isOptionProps(suspect: unknown): suspect is OptionProps {
  const props = suspect as OptionProps
  return ('label' in props && 'value' in props)
}

const _UserSelect: React.ForwardRefExoticComponent<UserSelectProps & React.RefAttributes<ExposedMethods>>
  = React.forwardRef<ExposedMethods, UserSelectProps>((props, ref) => {
    const { children, value, placeholder, onSelect, onInput, onBlur, onBackspace, editable } = props

    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const optionsRef = useRef<HTMLUListElement>(null)
    const [visible, setVisible] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)

    useImperativeHandle<ExposedMethods, ExposedMethods>(ref, () => ({
      focus() {
        inputRef.current?.focus() 
      },
      showOptions() {
        setVisible(true)
      },
      hideOptions() {
        setVisible(false)
        setSelectedIndex(0)
      },
    }))

    const options = useMemo(() => {
      return Children.map(children, (child) => child)?.reduce<OptionProps[]>((options, item) => {
        if (!React.isValidElement(item)) {
          return options
        }

        if (!isOptionProps(item.props)) {
          return options
        }

        const { label, value, icon } = item.props
        options.push({ label, value, icon })

        return options
      }, [])
    }, [children])

    const handleInput = useCallback<FormEventHandler<HTMLInputElement>>((event) => {
      /**
       * input是否可以编辑
       * 如果 editable = true 则不可手动输入
       */
      onInput && onInput(!editable ? event.currentTarget.value : '')
    }, [editable, onInput])

    const handleSelect = useCallback((value: OptionProps['value']) => () => {
      setSelectedIndex(0)
      onSelect && onSelect(value)
    }, [onSelect])

    const handleFocus = useCallback(() => {
      setVisible(true)
    }, [])

    const handleMouseMove = useCallback((index: number) => () => {
      setSelectedIndex(index)
    }, [])

    // 寻找关闭面板的时机
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        let current: HTMLElement | null = e.target as HTMLElement
        while (current) {
          if (current === inputRef.current) {
            break
          }

          current = current.parentElement
        }

        if (!current) {
          setVisible(false)
          setSelectedIndex(0)

          onBlur && onBlur()
        }
      }

      if (visible) {
        window.addEventListener('click', handler)
      } else {
        window.removeEventListener('click', handler)
      }

      return () => {
        window.removeEventListener('click', handler)
      }
    }, [onBlur, visible])

    // 响应键盘事件
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'ArrowUp') {
          if (!options) {
            return
          }
          // 索引步进 -1
          setSelectedIndex((options.length + (selectedIndex - 1)) % options.length)
          return
        }
        if (e.key === 'ArrowDown') {
          if (!options) {
            return
          }
          // 索引步进 +1
          setSelectedIndex((options.length + (selectedIndex + 1)) % options.length)
          return
        }
        if (e.key === 'Enter') {
          if (!options) {
            return
          }
          if (!options[selectedIndex]) {
            return
          }
          onSelect && setTimeout(() => {
            onSelect(options[selectedIndex].value)
          });

          setSelectedIndex(0)
          return
        }
        if (e.key === 'Backspace') {
          onBackspace && onBackspace()
          return
        }

        // NOTE: need to press twice to trigger event
        if (e.key === 'Escape') {
          setSelectedIndex(0)
          setVisible(false)

          onBlur && onBlur()
          return
        }

        setSelectedIndex(0)
      }

      containerRef.current && containerRef.current.addEventListener('keydown', handler, true)

      // eslint-disable-next-line react-hooks/exhaustive-deps
      return () => containerRef.current?.removeEventListener('keydown', handler, true)
    }, [onBackspace, onBlur, onSelect, options, selectedIndex, value])

    // 确保当前高亮选项一定出现在可视区域(Viewport)内
    // 参考 https://developer.mozilla.org/zh-CN/docs/Web/API/Element/scrollIntoView
    useEffect(() => {
      const $ul = optionsRef.current
      if (!$ul) {
        return
      }

      if ($ul.scrollHeight <= $ul.clientHeight) {
        return
      }

      const liCollection = $ul.querySelectorAll('li')
      const $li = liCollection.item(selectedIndex)

      if (!$li) {
        return
      }

      const elementTop = $li.offsetTop - $ul.scrollTop
      const elementHeight = $li.clientHeight
      const viewportHeight = $ul.clientHeight

      if (elementTop < 0) {
        $ul.scrollBy({ top: elementTop })
      }
      else if (elementTop + elementHeight > viewportHeight) {
        $ul.scrollBy({ top: elementTop + elementHeight - viewportHeight })
      }
    }, [selectedIndex])

    return (
      <Container ref={ containerRef } fullFill={ !!placeholder }>
        <Popover
          transitionName=''
          arrowPointAtCenter={ false }
          placement='bottomLeft'
          visible={ visible }
          getPopupContainer={() => containerRef.current as HTMLElement}
          content={
            <OptionList ref={ optionsRef }>
              { options?.map((item, index) => (
                <li key={ item.value.toString() }
                  className={ selectedIndex === index ? 'selected' : '' }
                  onClick={ handleSelect(item.value) }
                  onMouseMove={ handleMouseMove(index) }
                  >
                  { item.icon }
                  { item.label }
                </li>
              )) }
            </OptionList>
          }>
          <Input ref={inputRef} placeholder={placeholder}
            value={value}
            onChange={handleInput}
            onFocus={handleFocus}
          />
        </Popover>
      </Container>
    )
  })

_UserSelect.displayName = 'UserInput'

export const UserSelect: typeof _UserSelect & { Option: FC<OptionProps> } = Object.assign(_UserSelect, {
  Option: () => null
})

const Container = styled.div<{ fullFill: boolean }>`
  position: relative;
  flex: ${props => props.fullFill ? 'auto' : 'none'};

  .bizseer-faultlike-popover-inner-content {
    padding: 4px;
    font-size: 12px;
  }

  .bizseer-faultlike-popover {
    z-index: 10;
  }
`

const Input = styled.input`
  height: 22px;
  width: 100%;

  background-color: transparent;
  border: none;
  outline: none;
  margin: 0;
  padding: 0;
`

const OptionList = styled.ul`
  position: relative;

  margin: 0;
  padding: 0;
  list-style: none;

  width: 200px;
  min-height: 10px;
  max-height: 300px;
  overflow: auto;

  & > li {
    padding: 4px 8px;
    cursor: pointer;

    &.selected {
      background-color: #e6f7ff;
    }
    &:active {
      background-color: #bae7ff;
    }
  }
`