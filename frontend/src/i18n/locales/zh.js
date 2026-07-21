export default {
	common: {
		confirm: "确认", cancel: "取消", card: "卡片", lane: "列", noTagsFound: "未找到标签", close: "关闭",
	},
	header: {
		searchPlaceholder: "搜索", filterByTag: "按标签筛选", filterNone: "无筛选",
		sortBy: "排序",
		sort: { manually: "手动", nameAsc: "名称 (A-Z)", nameDesc: "名称 (Z-A)", tagsAsc: "标签 (A-Z)", tagsDesc: "标签 (Z-A)", dueAsc: "截止日期 (近到远)", dueDesc: "截止日期 (远到近)", lastUpdated: "最近更新", createdFirst: "创建时间最早" },
		viewMode: "视图模式",
		view: { extended: "展开", regular: "常规", compact: "紧凑", tight: "极简" },
		newLane: "新建列", selectCards: "选择卡片", exitSelection: "退出选择", export: "导出", login: "登录", logout: "退出", locale: "语言",
	},
	card: { due: "截止 {{date}}", complete: "标记完成" },
	cardName: { rename: "重命名", delete: "删除", showOptions: "显示选项" },
	laneName: { rename: "重命名", deleteCard: "删除卡片", deleteLane: "删除列", createCard: "创建卡片", showOptions: "显示选项" },
	expandedCard: {
		addTag: "标签", changeColor: "更改颜色", deleteTag: "删除标签", dueDate: "截止日期", newTagPlaceholder: "输入新标签名...",
		minimize: "缩小", expand: "展开", colorOption: "颜色 {{n}}", rename: "点击重命名",
		tagError: { duplicate: "标签已存在" },
		close: "关闭"
	},
	bulk: {
		selected: "已选 {{count}} 张卡片", selected_plural: "已选 {{count}} 张卡片",
		addTags: "添加标签", removeTags: "移除标签", setDueDate: "设置截止日期", delete: "删除", clearSelection: "清除选择",
		tagSearchPlaceholder: "搜索标签", removeTagPlaceholder: "移除标签", createTag: '创建 "{{tag}}"',
		deleteConfirm: "删除所选卡片？", deleteConfirm_plural: "删除所选卡片？",
	},
	validation: {
		mustHaveName: "必须填写名称", hiddenByDot: "以点开头会被隐藏", duplicateName: "名称重复",
		forbiddenChars: "包含非法字符", noMdExtension: "不能包含 .md 后缀", prohibitedName: "禁止的名称",
	},
	keyboard: { title: "键盘快捷键", sections: { navigation: "导航", cardActions: "卡片操作", general: "通用" }, shortcuts: {} },
}