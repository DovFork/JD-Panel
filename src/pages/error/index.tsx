import React, { useState, useEffect } from 'react';
import config from '@/utils/config';
import { request } from '@/utils/http';
import Terminal, { ColorMode, LineType } from '../../components/terminal';
import { PageLoading } from '@ant-design/pro-layout';
import { history } from 'umi';
import Ansi from 'ansi-to-react';
import './index.less';

const Error = ({ user, theme }: any) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState('暂无日志');

  const getLog = () => {
    setLoading(true);
    request
      .get(`${config.apiPrefix}public/panel/log`)
      .then((data: any) => {
        setData(data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user && user.username) {
      history.push('/crontab');
    }
  }, [user]);

  useEffect(() => {
    getLog();
  }, []);

  return (
    <div className="error-wrapper">
      {loading ? (
        <PageLoading />
      ) : (
        <Terminal
          name="服务错误"
          colorMode={theme === 'vs-dark' ? ColorMode.Dark : ColorMode.Light}
          lineData={[
            { type: LineType.Input, value: 'pm2 logs panel' },
            {
              type: LineType.Output,
              value: (
                <pre>
                  <Ansi>{data}</Ansi>
                </pre>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

export default Error;
