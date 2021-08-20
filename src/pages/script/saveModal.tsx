import React, { useEffect, useState } from 'react';
import { Modal, message, Input, Form } from 'antd';
import { request } from '@/utils/http';
import config from '@/utils/config';

const SaveModal = ({
  file,
  handleCancel,
  visible,
  isNewFile,
}: {
  file?: any;
  visible: boolean;
  handleCancel: (cks?: any[]) => void;
  isNewFile: boolean;
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleOk = async (values: any) => {
    setLoading(true);
    const payload = { ...file, ...values };
    request
      .post(`${config.apiPrefix}scripts`, {
        data: payload,
      })
      .then(({ code, data }) => {
        if (code === 200) {
          message.success('保存文件成功');
          handleCancel(data);
        } else {
          message.error(data);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    form.resetFields();
    setLoading(false);
  }, [file, visible]);

  return (
    <Modal
      title="保存文件"
      visible={visible}
      forceRender
      onOk={() => {
        form
          .validateFields()
          .then((values) => {
            handleOk(values);
          })
          .catch((info) => {
            console.log('Validate Failed:', info);
          });
      }}
      onCancel={() => handleCancel()}
      confirmLoading={loading}
    >
      <Form
        form={form}
        layout="vertical"
        name="script_modal"
        initialValues={file}
      >
        <Form.Item
          name="filename"
          label="文件名"
          rules={[{ required: true, message: '请输入文件名' }]}
        >
          <Input placeholder="请输入文件名" />
        </Form.Item>
        <Form.Item
          name="path"
          label="保存目录"
          rules={[{ required: true, message: '请输入保存目录' }]}
        >
          <Input placeholder="请输入保存目录" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SaveModal;
