// app/teacher/components/announcements/AnnouncementPage.js
"use client";

import { useState, useEffect } from "react";
import { FileText, Eye, Download, Bell, BookOpen } from "lucide-react";
import { announcementAPI, fundFormAPI } from "../../../lib/api";
import DataTable from "../../../admin/components/common/DataTable";

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [fundForms, setFundForms] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [loadingForms, setLoadingForms] = useState(true);

  useEffect(() => {
    loadAnnouncements();
    loadFundForms();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      // ชั่วคราวใช้ข้อมูล mock แทน เพราะ backend ยังไม่พร้อม
      console.log('Announcements API not ready yet, using mock data');
      
      // Mock data สำหรับทดสอบ
      const mockAnnouncements = [
        {
          announcement_id: 1,
          title: 'ประกาศเปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568',
          file_name: 'ประกาศทุนวิจัย2568.pdf',
          description: 'กองทุนส่งเสริมการวิจัยและนวัตกรรม เปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568',
          announcement_type: 'research_fund',
          priority: 'high',
          status: 'active'
        },
        {
          announcement_id: 2,
          title: 'แนวทางการเขียนข้อเสนอโครงการวิจัย',
          file_name: 'แนวทางการเขียนข้อเสนอโครงการ.pdf',
          description: 'เอกสารแนวทางและข้อแนะนำสำหรับการเขียนข้อเสนอโครงการวิจัย',
          announcement_type: 'research_fund',
          priority: 'normal',
          status: 'active'
        },
        {
          announcement_id: 3,
          title: 'ประกาศเปิดรับสมัครทุนอุดหนุนกิจกรรม ไตรมาส 1/2568',
          file_name: 'ประกาศทุนกิจกรรมไตรมาส1-2568.pdf',
          description: 'เปิดรับสมัครทุนอุดหนุนกิจกรรมประจำไตรมาส 1 ประจำปี 2568',
          announcement_type: 'promotion_fund',
          priority: 'normal',
          status: 'active'
        }
      ];
      
      setAnnouncements(mockAnnouncements);
      
      // เมื่อ backend พร้อมแล้วให้ uncomment บรรทัดนี้
      // const response = await announcementAPI.getAnnouncements({ active_only: true });
      // if (response.success) {
      //   setAnnouncements(response.data || []);
      // }
    } catch (error) {
      console.error('Error loading announcements:', error);
      // ใช้ mock data เมื่อเกิด error
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const loadFundForms = async () => {
    try {
      setLoadingForms(true);
      const response = await fundFormAPI.getFundForms({ active_only: true });
      if (response.success) {
        setFundForms(response.data || []);
      } else {
        setFundForms([]);
      }
    } catch (error) {
      console.error('Error loading fund forms:', error);
      // ใช้ mock data เมื่อเกิด error
      setFundForms([]);
    } finally {
      setLoadingForms(false);
    }
  };

  const handleViewFile = (id, type) => {
    if (type === 'announcement') {
      announcementAPI.viewAnnouncementFile(id);
    } else {
      fundFormAPI.viewFundForm(id);
    }
  };

  const handleDownloadFile = (id, type) => {
    if (type === 'announcement') {
      announcementAPI.downloadAnnouncementFile(id);
    } else {
      fundFormAPI.downloadFundForm(id);
    }
  };

  const getAnnouncementTypeColor = (type) => {
    switch (type) {
      case 'research_fund':
        return 'bg-blue-100 text-blue-800';
      case 'promotion_fund':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAnnouncementTypeName = (type) => {
    switch (type) {
      case 'research_fund':
        return 'ทุนวิจัย';
      case 'promotion_fund':
        return 'ทุนกิจกรรม';
      default:
        return 'ทั่วไป';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityName = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'ด่วน';
      case 'high':
        return 'สำคัญ';
      default:
        return 'ปกติ';
    }
  };

  const announcementColumns = [
    {
      header: "ชื่อไฟล์",
      accessor: "file_name",
      className: "font-medium",
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.title}</div>
        </div>
      )
    },
    {
      header: "ประเภท",
      accessor: "announcement_type",
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getAnnouncementTypeColor(value)}`}>
          {getAnnouncementTypeName(value)}
        </span>
      )
    },
    {
      header: "ความสำคัญ",
      accessor: "priority",
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(value)}`}>
          {getPriorityName(value)}
        </span>
      )
    },
    {
      header: "รายละเอียด",
      accessor: "description",
      render: (value) => (
        <span className="text-gray-700">
          {value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : '-'}
        </span>
      )
    },
    {
      header: "ดูไฟล์/ดาวน์โหลด",
      accessor: "actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewFile(row.announcement_id, 'announcement')}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            title="ดูไฟล์"
          >
            <Eye size={16} />
            ดู
          </button>
          <button
            onClick={() => handleDownloadFile(row.announcement_id, 'announcement')}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
            title="ดาวน์โหลดไฟล์"
          >
            <Download size={16} />
            ดาวน์โหลด
          </button>
        </div>
      )
    }
  ];

  const fundFormColumns = [
    {
      header: "ชื่อไฟล์",
      accessor: "file_name",
      className: "font-medium",
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.title}</div>
        </div>
      )
    },
    {
      header: "ประเภทฟอร์ม",
      accessor: "form_type",
      render: (value) => {
        const typeNames = {
          application: 'แบบฟอร์มสมัคร',
          report: 'แบบฟอร์มรายงาน',
          evaluation: 'แบบฟอร์มประเมิน',
          guidelines: 'แนวทางปฏิบัติ',
          other: 'อื่นๆ'
        };
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
            {typeNames[value] || value}
          </span>
        );
      }
    },
    {
      header: "หมวดหมู่กองทุน",
      accessor: "fund_category",
      render: (value) => {
        const categoryNames = {
          research_fund: 'ทุนวิจัย',
          promotion_fund: 'ทุนกิจกรรม',
          both: 'ทั้งสองประเภท'
        };
        const colors = {
          research_fund: 'bg-blue-100 text-blue-800',
          promotion_fund: 'bg-green-100 text-green-800',
          both: 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[value] || colors.both}`}>
            {categoryNames[value] || value}
          </span>
        );
      }
    },
    {
      header: "รายละเอียด",
      accessor: "description",
      render: (value) => (
        <span className="text-gray-700">
          {value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : '-'}
        </span>
      )
    },
    {
      header: "ดูไฟล์/ดาวน์โหลด",
      accessor: "actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewFile(row.form_id, 'form')}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            title="ดูไฟล์"
          >
            <Eye size={16} />
            ดู
          </button>
          <button
            onClick={() => handleDownloadFile(row.form_id, 'form')}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
            title="ดาวน์โหลดไฟล์"
          >
            <Download size={16} />
            ดาวน์โหลด
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FileText size={32} className="text-gray-600" />
          ประกาศกองทุนวิจัยและนวัตกรรม
        </h1>
        <p className="mt-1 text-gray-600">ดูประกาศและดาวน์โหลดแบบฟอร์มที่เกี่ยวข้องกับการขอทุน</p>
        <div className="mt-4 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-24"></div>
      </div>

      {/* Content - Vertical Layout */}
      <div className="space-y-8">
        {/* Announcements Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">ประกาศ</h2>
                <p className="text-sm text-gray-600">ข่าวสารและประกาศจากกองทุน</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {loadingAnnouncements ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">กำลังโหลด...</span>
              </div>
            ) : (
              <DataTable
                columns={announcementColumns}
                data={announcements}
                emptyMessage="ไม่มีประกาศในขณะนี้"
              />
            )}
          </div>
        </div>

        {/* Fund Forms Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BookOpen size={20} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">แบบฟอร์มการขอทุน</h2>
                <p className="text-sm text-gray-600">แบบฟอร์มและเอกสารที่จำเป็น</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {loadingForms ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">กำลังโหลด...</span>
              </div>
            ) : (
              <DataTable
                columns={fundFormColumns}
                data={fundForms}
                emptyMessage="ไม่มีแบบฟอร์มในขณะนี้"
              />
            )}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">คำแนะนำการใช้งาน</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• คลิก "ดู" เพื่อเปิดไฟล์ในหน้าต่างใหม่</li>
              <li>• คลิก "ดาวน์โหลด" เพื่อบันทึกไฟล์ลงเครื่องคอมพิวเตอร์</li>
              <li>• ตรวจสอบประกาศและแบบฟอร์มให้ล่าสุดก่อนยื่นคำร้อง</li>
              <li>• หากมีปัญหาการดาวน์โหลด กรุณาติดต่อผู้ดูแลระบบ</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}