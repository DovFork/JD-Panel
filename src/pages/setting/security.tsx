import React, { useEffect, useState } from 'react';
import { Typography, Input, Form, Button, Spin, message } from 'antd';
import { request } from '@/utils/http';
import config from '@/utils/config';
import { history } from 'umi';
import QRCode from 'qrcode.react';

const { Title, Link } = Typography;

const SecuritySettings = ({ user }: any) => {
  const [loading, setLoading] = useState(false);
  const [twoFactorActived, setTwoFactorActived] = useState<boolean>();
  const [twoFactoring, setTwoFactoring] = useState(false);
  const [twoFactorInfo, setTwoFactorInfo] = useState<any>();
  const [code, setCode] = useState<string>();

  const handleOk = (values: any) => {
    request
      .post(`${config.apiPrefix}user`, {
        data: {
          username: values.username,
          password: values.password,
        },
      })
      .then((data: any) => {
        localStorage.removeItem(config.authKey);
        history.push('/login');
      })
      .catch((error: any) => {
        console.log(error);
      });
  };

  const activeOrDeactiveTwoFactor = () => {
    if (twoFactorActived) {
      deactiveTowFactor();
    } else {
      getTwoFactorInfo();
      setTwoFactoring(true);
    }
  };

  const deactiveTowFactor = () => {
    request
      .put(`${config.apiPrefix}user/two-factor/deactive`)
      .then((data: any) => {
        if (data.data) {
          setTwoFactorActived(false);
        }
      })
      .catch((error: any) => {
        console.log(error);
      });
  };

  const completeTowFactor = () => {
    request
      .put(`${config.apiPrefix}user/two-factor/active`, { data: { code } })
      .then((data: any) => {
        if (data.data) {
          message.success('激活成功');
          setTwoFactoring(false);
          setTwoFactorActived(true);
        }
      })
      .catch((error: any) => {
        console.log(error);
      });
  };

  const getTwoFactorInfo = () => {
    request
      .get(`${config.apiPrefix}user/two-factor/init`)
      .then((data: any) => {
        setTwoFactorInfo(data.data);
      })
      .catch((error: any) => {
        console.log(error);
      });
  };

  useEffect(() => {
    setTwoFactorActived(user && user.twoFactorActived);
  }, [user]);

  return twoFactoring ? (
    <>
      {twoFactorInfo ? (
        <div>
          <Title level={5}>第一步</Title>
          下载两步验证手机应用，比如 Google Authenticator 、
          <Link
            href="https://www.microsoft.com/en-us/security/mobile-authenticator-app"
            target="_blank"
          >
            Microsoft Authenticator
          </Link>
          、
          <Link href="https://authy.com/download/" target="_blank">
            Authy
          </Link>
          、
          <Link
            href="https://support.1password.com/one-time-passwords/"
            target="_blank"
          >
            1Password
          </Link>
          、
          <Link
            href="https://support.logmeininc.com/lastpass/help/lastpass-authenticator-lp030014"
            target="_blank"
          >
            LastPass Authenticator
          </Link>
          <Title style={{ marginTop: 5 }} level={5}>
            第二步
          </Title>
          使用手机应用扫描二维码，或者输入秘钥 {twoFactorInfo?.secret}
          <div style={{ marginTop: 10 }}>
            <QRCode value={twoFactorInfo?.url} />
          </div>
          <Title style={{ marginTop: 5 }} level={5}>
            第三步
          </Title>
          输入手机应用上的6位数字
          <Input
            style={{ margin: '10px 0 10px 0', display: 'block', maxWidth: 200 }}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
          />
          <Button type="primary" onClick={completeTowFactor}>
            完成设置
          </Button>
        </div>
      ) : (
        <Spin />
      )}
    </>
  ) : (
    <>
      <div
        style={{
          fontSize: 18,
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 8,
          paddingBottom: 4,
        }}
      >
        修改用户名密码
      </div>
      <Form onFinish={handleOk} layout="vertical">
        <Form.Item
          label="用户名"
          name="username"
          rules={[{ required: true }]}
          hasFeedback
          style={{ maxWidth: 300 }}
        >
          <Input placeholder="用户名" />
        </Form.Item>
        <Form.Item
          label="密码"
          name="password"
          rules={[{ required: true }]}
          hasFeedback
          style={{ maxWidth: 300 }}
        >
          <Input type="password" placeholder="密码" />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          保存
        </Button>
      </Form>

      <div
        style={{
          fontSize: 18,
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 8,
          paddingBottom: 4,
          marginTop: 16,
        }}
      >
        两步验证
      </div>
      <Button
        type="primary"
        danger={twoFactorActived}
        onClick={activeOrDeactiveTwoFactor}
      >
        {twoFactorActived ? '禁用' : '启用'}
      </Button>
    </>
  );
};

export default SecuritySettings;
