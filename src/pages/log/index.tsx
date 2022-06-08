import { useState, useEffect, useCallback, Key, useRef } from 'react';
import { TreeSelect, Tree, Input, Empty } from 'antd';
import config from '@/utils/config';
import { PageContainer } from '@ant-design/pro-layout';
import Editor from '@monaco-editor/react';
import { request } from '@/utils/http';
import styles from './index.module.less';
import { Controlled as CodeMirror } from 'react-codemirror2';
import SplitPane from 'react-split-pane';

function getFilterData(keyword: string, data: any) {
  const expandedKeys: string[] = [];
  if (keyword) {
    const tree: any = [];
    data.forEach((item: any) => {
      if (item.title.toLocaleLowerCase().includes(keyword)) {
        tree.push(item);
      } else {
        const children: any[] = [];
        (item.children || []).forEach((subItem: any) => {
          if (subItem.title.toLocaleLowerCase().includes(keyword)) {
            children.push(subItem);
          }
        });
        if (children.length > 0) {
          tree.push({
            ...item,
            children,
          });
          expandedKeys.push(item.key);
        }
      }
    });
    return { tree, expandedKeys };
  }
  return { tree: data, expandedKeys };
}

const Log = ({ headerStyle, isPhone, theme }: any) => {
  const [title, setTitle] = useState('请选择日志文件');
  const [value, setValue] = useState('请选择日志文件');
  const [select, setSelect] = useState<any>();
  const [data, setData] = useState<any[]>([]);
  const [filterData, setFilterData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [height, setHeight] = useState<number>();
  const treeDom = useRef<any>();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const getLogs = () => {
    setLoading(true);
    request
      .get(`${config.apiPrefix}logs`)
      .then((data) => {
        setData(data.data);
        setFilterData(data.data);
      })
      .finally(() => setLoading(false));
  };

  const getLog = (node: any) => {
    request
      .get(`${config.apiPrefix}logs/${node.title}?path=${node.parent || ''}`)
      .then((data) => {
        setValue(data.data);
      });
  };

  const onSelect = (value: any, node: any) => {
    if (node.key === select || !value) {
      return;
    }
    setValue('加载中...');
    setSelect(value);
    setTitle(node.key);
    getLog(node);
  };

  const onTreeSelect = useCallback((keys: Key[], e: any) => {
    onSelect(keys[0], e.node);
  }, []);

  const onSearch = useCallback(
    (e) => {
      const keyword = e.target.value;
      const { tree, expandedKeys } = getFilterData(
        keyword.toLocaleLowerCase(),
        data,
      );
      setFilterData(tree);
      setExpandedKeys(expandedKeys);
    },
    [data, setFilterData],
  );

  useEffect(() => {
    getLogs();
    if (treeDom && treeDom.current) {
      setHeight(treeDom.current.clientHeight);
    }
  }, []);

  return (
    <PageContainer
      className="ql-container-wrapper log-wrapper"
      title={title}
      loading={loading}
      extra={
        isPhone && [
          <TreeSelect
            className="log-select"
            value={select}
            dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
            treeData={data}
            placeholder="请选择日志"
            fieldNames={{ value: 'key', label: 'title' }}
            showSearch
            onSelect={onSelect}
          />,
        ]
      }
      header={{
        style: headerStyle,
      }}
    >
      <div className={`${styles['log-container']} log-container`}>
        {!isPhone && (
          <SplitPane split="vertical" size={200} maxSize={-100}>
            <div className={styles['left-tree-container']}>
              {data.length > 0 ? (
                <>
                  <Input.Search
                    className={styles['left-tree-search']}
                    onChange={onSearch}
                    placeholder="请输入日志名"
                    allowClear
                  ></Input.Search>
                  <div className={styles['left-tree-scroller']} ref={treeDom}>
                    <Tree
                      className={styles['left-tree']}
                      treeData={filterData}
                      showIcon={true}
                      height={height}
                      selectedKeys={[select]}
                      showLine={{ showLeafIcon: true }}
                      onSelect={onTreeSelect}
                    ></Tree>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                  }}
                >
                  <Empty
                    description="暂无日志"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              )}
            </div>
            <Editor
              language="shell"
              theme={theme}
              value={value}
              options={{
                readOnly: true,
                fontSize: 12,
                lineNumbersMinChars: 3,
                fontFamily: 'Source Code Pro',
                folding: false,
                glyphMargin: false,
                wordWrap: 'on',
              }}
            />
          </SplitPane>
        )}
        {isPhone && (
          <CodeMirror
            value={value}
            options={{
              lineNumbers: true,
              lineWrapping: true,
              styleActiveLine: true,
              matchBrackets: true,
              readOnly: true,
            }}
            onBeforeChange={(editor, data, value) => {
              setValue(value);
            }}
            onChange={(editor, data, value) => {}}
          />
        )}
      </div>
    </PageContainer>
  );
};

export default Log;
