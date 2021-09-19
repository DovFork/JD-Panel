import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Form,
  Radio,
  Tabs,
  Table,
  Tooltip,
  Space,
  Tag,
  Modal,
  message,
  Typography,
} from 'antd';
import config from '@/utils/config';
import { PageContainer } from '@ant-design/pro-layout';
import { request } from '@/utils/http';
import {
  enable as enableDarkMode,
  disable as disableDarkMode,
  auto as followSystemColorScheme,
  setFetchMethod,
} from 'darkreader';
import AppModal from './appModal';
import {
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import SecuritySettings from './security';
import LoginLog from './loginLog';
import NotificationSetting from './notification';

const { Text } = Typography;
const optionsWithDisabled = [
  { label: '亮色', value: 'light' },
  { label: '暗色', value: 'dark' },
  { label: '跟随系统', value: 'auto' },
];

const Setting = ({ headerStyle, isPhone, user, reloadUser }: any) => {
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center' as const,
    },
    {
      title: 'Client ID',
      dataIndex: 'client_id',
      key: 'client_id',
      align: 'center' as const,
      render: (text: string, record: any) => {
        return <Text copyable>{record.client_id}</Text>;
      },
    },
    {
      title: 'Client Secret',
      dataIndex: 'client_secret',
      key: 'client_secret',
      align: 'center' as const,
      render: (text: string, record: any) => {
        return <Text copyable={{ text: record.client_secret }}>*******</Text>;
      },
    },
    {
      title: '权限',
      dataIndex: 'scopes',
      key: 'scopes',
      align: 'center' as const,
      render: (text: string, record: any) => {
        return record.scopes.map((scope: any) => {
          return <Tag key={scope}>{(config.scopesMap as any)[scope]}</Tag>;
        });
      },
    },
    {
      title: '操作',
      key: 'action',
      align: 'center' as const,
      render: (text: string, record: any, index: number) => {
        const isPc = !isPhone;
        return (
          <Space size="middle" style={{ paddingLeft: 8 }}>
            <Tooltip title={isPc ? '编辑' : ''}>
              <a onClick={() => editApp(record, index)}>
                <EditOutlined />
              </a>
            </Tooltip>
            <Tooltip title={isPc ? '重置secret' : ''}>
              <a onClick={() => resetSecret(record, index)}>
                <ReloadOutlined />
              </a>
            </Tooltip>
            <Tooltip title={isPc ? '删除' : ''}>
              <a onClick={() => deleteApp(record, index)}>
                <DeleteOutlined />
              </a>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const [loading, setLoading] = useState(true);
  const defaultDarken = localStorage.getItem('qinglong_dark_theme') || 'auto';
  const [theme, setTheme] = useState(defaultDarken);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editedApp, setEditedApp] = useState();
  const [tabActiveKey, setTabActiveKey] = useState('security');
  const [loginLogData, setLoginLogData] = useState<any[]>([]);
  const [notificationInfo, setNotificationInfo] = useState<any>();

  const themeChange = (e: any) => {
    setTheme(e.target.value);
    localStorage.setItem('qinglong_dark_theme', e.target.value);
  };

  const getApps = () => {
    setLoading(true);
    request
      .get(`${config.apiPrefix}apps`)
      .then((data: any) => {
        setDataSource(data.data);
      })
      .finally(() => setLoading(false));
  };

  const addApp = () => {
    setIsModalVisible(true);
  };

  const editApp = (record: any, index: number) => {
    setEditedApp(record);
    setIsModalVisible(true);
  };

  const deleteApp = (record: any, index: number) => {
    Modal.confirm({
      title: '确认删除',
      content: (
        <>
          确认删除应用{' '}
          <Text style={{ wordBreak: 'break-all' }} type="warning">
            {record.name}
          </Text>{' '}
          吗
        </>
      ),
      onOk() {
        request
          .delete(`${config.apiPrefix}apps`, { data: [record._id] })
          .then((data: any) => {
            if (data.code === 200) {
              message.success('删除成功');
              const result = [...dataSource];
              result.splice(index, 1);
              setDataSource(result);
            } else {
              message.error(data);
            }
          });
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  };

  const resetSecret = (record: any, index: number) => {
    Modal.confirm({
      title: '确认重置',
      content: (
        <>
          确认重置应用{' '}
          <Text style={{ wordBreak: 'break-all' }} type="warning">
            {record.name}
          </Text>{' '}
          的Secret吗
          <br />
          <Text type="secondary">重置Secret会让当前应用所有token失效</Text>
        </>
      ),
      onOk() {
        request
          .put(`${config.apiPrefix}apps/${record._id}/reset-secret`)
          .then((data: any) => {
            if (data.code === 200) {
              message.success('重置成功');
              handleApp(data.data);
            } else {
              message.error(data);
            }
          });
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  };

  const handleCancel = (app?: any) => {
    setIsModalVisible(false);
    if (app) {
      handleApp(app);
    }
  };

  const handleApp = (app: any) => {
    const index = dataSource.findIndex((x) => x._id === app._id);
    const result = [...dataSource];
    if (index === -1) {
      result.push(app);
    } else {
      result.splice(index, 1, {
        ...app,
      });
    }
    setDataSource(result);
  };

  const getLoginLog = () => {
    request
      .get(`${config.apiPrefix}user/login-log`)
      .then((data: any) => {
        setLoginLogData(data.data);
      })
      .catch((error: any) => {
        console.log(error);
      });
  };

  const tabChange = (activeKey: string) => {
    setTabActiveKey(activeKey);
    if (activeKey === 'app') {
      getApps();
    } else if (activeKey === 'login') {
      getLoginLog();
    } else if (activeKey === 'notification') {
      getNotification();
    }
  };

  const getNotification = () => {
    request
      .get(`${config.apiPrefix}user/notification`)
      .then((data: any) => {
        setNotificationInfo(data.data);
      })
      .catch((error: any) => {
        console.log(error);
      });
  };

  useEffect(() => {
    setFetchMethod(window.fetch);
    if (theme === 'dark') {
      enableDarkMode({});
    } else if (theme === 'light') {
      disableDarkMode();
    } else {
      followSystemColorScheme({});
    }
  }, [theme]);

  return (
    <PageContainer
      className="ql-container-wrapper"
      title="系统设置"
      header={{
        style: headerStyle,
      }}
      extra={
        tabActiveKey === 'app'
          ? [
              <Button key="2" type="primary" onClick={() => addApp()}>
                添加应用
              </Button>,
            ]
          : []
      }
    >
      <Tabs
        defaultActiveKey="security"
        size="small"
        tabPosition="top"
        onChange={tabChange}
      >
        <Tabs.TabPane tab="安全设置" key="security">
          <SecuritySettings user={user} userChange={reloadUser} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="应用设置" key="app">
          <Table
            columns={columns}
            pagination={false}
            dataSource={dataSource}
            rowKey="_id"
            size="middle"
            scroll={{ x: 768 }}
            loading={loading}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="通知设置" key="notification">
          <NotificationSetting data={notificationInfo} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="登陆日志" key="login">
          <LoginLog data={loginLogData} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="其他设置" key="theme">
          <Form layout="vertical">
            <Form.Item label="主题设置" name="theme" initialValue={theme}>
              <Radio.Group
                options={optionsWithDisabled}
                onChange={themeChange}
                value={theme}
                optionType="button"
                buttonStyle="solid"
              />
            </Form.Item>
          </Form>
        </Tabs.TabPane>
      </Tabs>
      <AppModal
        visible={isModalVisible}
        handleCancel={handleCancel}
        app={editedApp}
      />
    </PageContainer>
  );
};

export default Setting;
