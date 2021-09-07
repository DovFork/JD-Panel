import React, { useEffect, useState } from 'react';
import { Typography, Table, Tag, Button, Spin, message } from 'antd';
import { request } from '@/utils/http';
import config from '@/utils/config';

const { Text, Link } = Typography;

enum LoginStatus {
  '成功',
  '失败',
}

enum LoginStatusColor {
  'success',
  'error',
}

const columns = [
  {
    title: '序号',
    align: 'center' as const,
    width: 50,
    render: (text: string, record: any, index: number) => {
      return <span style={{ cursor: 'text' }}>{index + 1} </span>;
    },
  },
  {
    title: '登陆时间',
    dataIndex: 'timestamp',
    key: 'timestamp',
    align: 'center' as const,
    render: (text: string, record: any) => {
      return <span>{new Date(record.timestamp).toLocaleString()}</span>;
    },
  },
  {
    title: '登陆地址',
    dataIndex: 'address',
    key: 'address',
    align: 'center' as const,
  },
  {
    title: '登陆IP',
    dataIndex: 'ip',
    key: 'ip',
    align: 'center' as const,
  },
  {
    title: '登陆状态',
    dataIndex: 'status',
    key: 'status',
    align: 'center' as const,
    render: (text: string, record: any) => {
      return (
        <Tag color={LoginStatusColor[record.status]} style={{ marginRight: 0 }}>
          {LoginStatus[record.status]}
        </Tag>
      );
    },
  },
];

const LoginLog = ({ data }: any) => {
  return (
    <>
      <Table
        columns={columns}
        pagination={false}
        dataSource={data}
        rowKey="_id"
        size="middle"
        scroll={{ x: 768 }}
      />
    </>
  );
};

export default LoginLog;
