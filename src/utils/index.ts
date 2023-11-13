import { SearchProps } from '@/components/Search'
/**
 * 序列化条件表达式
 * @param conditions 条件表达式
 * @returns JSON 对象格式的查询条件
 */
export const serializeConditions = (conditions: Required<SearchProps>['value']): Record<string, unknown | unknown[]> => {
    // 将查询条件映射到 key 上
    const mappings = conditions.reduce<Record<string, unknown | unknown[]>>(
        (acc, item) => {
        if (item.value.length === 0) {
            return acc
        }

        const keyName = item.name.toString()
        const value = item.value[0][1]
        // 支持多选
        const multiple = [
            'task2',
        ]

        if (!multiple.includes(keyName)) {
            acc[keyName] = value

            return acc
        }

        if (!acc[keyName]) {
            acc[keyName] = []
        }

        ;(acc[keyName] as unknown[]).push(item.value[0][1])

        return acc
        },
        {}
    )

    return mappings
}